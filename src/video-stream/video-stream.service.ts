import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { VideoStreamConfig } from './video-stream-config.model';
import * as stream from 'stream';
import * as StreamSplit from 'stream-split';
import { of, concat } from 'rxjs';

// TODO: separate file
// Packet from data ( default binary = true )
interface Packet {
  data: Buffer | string;
  binary: boolean;
}

interface CapHeader {
  lastIdrFrame: Buffer;
  sps: Buffer;
  pps: Buffer;
}

@Injectable()
export class VideoStreamService {
  // general
  private command = 'raspivid';
  private logger = new Logger(this.constructor.name);

  // capture
  private capProcess: ChildProcess;
  private capSubject: Subject<Packet>;
  private capHeader: CapHeader = {
    lastIdrFrame: undefined,
    sps: undefined,
    pps: undefined,
  };
  private capStartingHeaderSubject: ReplaySubject<Packet>;

  // TODO: support live reload, read from file etc
  private config: VideoStreamConfig = {
    // width & height for mode 4 https://picamera.readthedocs.io/en/release-1.12/fov.html
    width: 960, // px
    height: 720, // px
    rotation: 270, // degrees
    profile: 'baseline',
    framerate: 24,
  };

  getCapture(): Observable<Packet> {
    if (!this.isCapturing()) {
      this.startCapture();
    }

    return concat(this.getStreamHeader(), this.capSubject);
  }

  killCapture() {
    this.logger.log('Killing capture process');
    if (this.capProcess) {
      this.capProcess.kill();
    } else {
      this.logger.log('Capture process is already stopped');
    }
  }

  isCapturing(): boolean {
    return Boolean(this.capSubject) && Boolean(this.capProcess);
  }

  private startCapture() {
    this.logger.log('Starting capture process');
    this.initState();
    this.setupEvents();
    this.setupStream();
  }

  private initState() {
    this.capSubject = new Subject<Packet>();
    this.capProcess = spawn(this.command, [
      '--width',
      `${this.config.width}`,
      '--height',
      `${this.config.height}`,
      '--rotation',
      `${this.config.rotation}`,
      '--profile',
      `${this.config.profile}`,
      '--framerate',
      `${this.config.framerate}`,
      '--timeout',
      '0',
      '-o',
      '-',
    ]);
    this.capStartingHeaderSubject = new ReplaySubject<Packet>();
  }

  private setupStream() {
    const NalSeparator = Buffer.from([0, 0, 0, 1]);
    const self = this;

    this.capProcess.stdout
      .pipe(new StreamSplit(NalSeparator))
      .pipe(
        new stream.Transform({
          transform: function (chunk, encoding, callback) {
            const completeChunk = Buffer.concat([NalSeparator, chunk]);
            const chunkType = chunk[0] & 0b11111;

            switch (chunkType) {
              case 7: // SPS
                if (!self.capHeader.sps) {
                  self.updateInitialState(completeChunk);
                }
                self.capHeader.sps = completeChunk;
                break;
              case 8: // PPS
                if (!self.capHeader.pps) {
                  self.updateInitialState(completeChunk);
                }
                self.capHeader.pps = completeChunk;
                break;
              case 5: // IDR
                if (!self.capHeader.lastIdrFrame) {
                  self.updateInitialState(completeChunk);
                }
                self.capHeader.lastIdrFrame = completeChunk;
              // @Fallthrough
              default:
                this.push(completeChunk);
            }

            self.tryCompleteInitialState();

            callback();
          },
        }),
      )
      .on('data', (data: any) => {
        this.capSubject.next({ data, binary: true });
      });
  }

  private updateInitialState(chunk) {
    if (this.capStartingHeaderSubject !== undefined) {
      this.capStartingHeaderSubject.next({ data: chunk, binary: true });
    }
  }

  private tryCompleteInitialState() {
    if (
      this.capStartingHeaderSubject !== undefined &&
      Object.values(this.capHeader).every((val) => val != undefined)
    ) {
      this.capStartingHeaderSubject.complete();
      this.capStartingHeaderSubject = undefined;
    }
  }

  private setupEvents() {
    // closing & exiting
    this.capProcess.on('close', (code) => {
      const message = `${this.command} closed all stdio with code ${code}`;
      if (code === 0 || code == null) {
        if (this.isCapturing()) {
          this.logger.warn(`${message} before exiting`);
        } else {
          this.logger.log(message);
        }
      } else {
        this.logger.error(message);
      }
    });

    this.capProcess.on('exit', (code) => {
      this.logger.log(`${this.command} exited with code ${code}`);
      this.capSubject.complete();
      this.cleanup();
    });

    // error state handling
    this.capProcess.on('error', (error) => {
      this.logger.error(`Received error: ${error}`);
      this.capSubject.error(error);
      this.cleanup();
    });

    this.capProcess.stderr.on('data', (data) => {
      this.logger.warn(`Received data on stderr: ${data}`);
    });
  }

  private cleanup() {
    this.capProcess = undefined;
    this.capSubject = undefined;
    this.capHeader = {
      lastIdrFrame: undefined,
      sps: undefined,
      pps: undefined,
    };
    this.capStartingHeaderSubject = undefined;
  }

  private getStreamHeader(): Observable<Packet> {
    const staticHeader: Packet = {
      data: JSON.stringify({
        action: 'init',
        width: this.config.width,
        height: this.config.height,
      }),
      binary: false,
    };

    return concat(
      of(staticHeader),
      this.capStartingHeaderSubject
        ? this.capStartingHeaderSubject
        : of(
            {
              data: this.capHeader.sps,
              binary: true,
            },
            {
              data: this.capHeader.pps,
              binary: true,
            },
            {
              data: this.capHeader.lastIdrFrame,
              binary: true,
            },
          ),
    );
  }
}
