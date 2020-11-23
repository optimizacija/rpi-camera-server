import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { Observable, Subject } from 'rxjs';
import { VideoStreamConfig } from './video-stream-config.model';
import * as stream from 'stream';
import * as StreamSplit from 'stream-split';
import { of, concat } from 'rxjs';

// TODO: separate file
interface Packet {
  data: Buffer | string;
  binary: boolean;
}

interface CapState {
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
  private capState: CapState = { lastIdrFrame: undefined, sps: undefined, pps: undefined};
  
  // TODO: support live reload, read from file etc
  private config: VideoStreamConfig = {
    width: 960, // px
    height: 540, // px
    profile: 'baseline',
    framerate: 20,
  };
  
  getCapture(): Observable<Packet> {
    if (!this.isCapturing()) {
      this._startCapture();
    }
    
    return concat(this._getStreamHeader(), this.capSubject);
  }
  
  killCapture() {
    this.logger.log('Killing capture process');
    this.capProcess.kill();
  }
  
  isCapturing(): boolean {
    return Boolean(this.capSubject) && Boolean(this.capProcess);
  }
  
  private _startCapture() {
    this.logger.log('Starting capture process');
    this._initState();
    this._setupEvents();
    this._setupStream();
  }
  
  private _initState() {
    this.capSubject = new Subject<Packet>();
    this.capProcess = spawn(this.command, [
      '--width', `${this.config.width}`,
      '--height', `${this.config.height}`,
      '--profile', `${this.config.profile}`,
      '--framerate', `${this.config.framerate}`,
      '--timeout', '0',
      '-o', '-',
    ]);
  }
  
  private _setupStream() {
    // shamelessly took from https://github.com/pimterry/raspivid-stream/blob/master/index.js
    const NALseparator = new Buffer([0,0,0,1]);
    const refCapState = this.capState;
  
    this.capProcess.stdout
      .pipe(new StreamSplit(NALseparator))
      .pipe(new stream.Transform({ transform: function (chunk, encoding, callback) {
          const completeChunk = Buffer.concat([NALseparator, chunk]);

          const chunkType = chunk[0] & 0b11111;
          let chunkName = 'unknown';

          switch(chunkType) {
            case 7: // SPS
              refCapState.sps = completeChunk;
              break;
            case 8: // PPS
              refCapState.pps = completeChunk;
              break;
            case 5: // IDR
              refCapState.lastIdrFrame = completeChunk;
              // @Fallthrough
            default:
              this.push(completeChunk);
          }
                    
          // TODO: remove
          if (chunkType !== 1) {
            console.log(`${chunkName}[${chunkType}]: ${chunk.length}`);
          }

          callback();
      }})).on('data', data => {
        this.capSubject.next({ data, binary: true });
      });
  }
  
  private _setupEvents() {
    // closing & exiting
    this.capProcess.on('close', code => {
      const message = `${this.command} closed all stdio with code ${code}`
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
    
    this.capProcess.on('exit', code => {
      this.logger.log(`${this.command} exited with code ${code}`);
      this.capSubject.complete();
      this._cleanup();
    });
    
    // error state handling
    this.capProcess.on('error', error => {
      this.logger.error(`Received error: ${error}`);
      this.capSubject.error(error);
      this._cleanup();
    });
    
    this.capProcess.stderr.on('data', data => {
      this.logger.warn(`Received data on stderr: ${data}`);
    });
  }
  
  private _cleanup() {
    this.capProcess = undefined;
    this.capSubject = undefined;
  }
  
  private _getStreamHeader(): Observable<Packet> {
    return of(
      { 
        data: JSON.stringify({
          action: 'init',
          width: this.config.width,
          height: this.config.height
        }),
        binary: false
      },
      {
        data: this.capState.sps, 
        binary: true
      },
      {
        data: this.capState.pps, 
        binary: true
      },
      {
        data: this.capState.lastIdrFrame, 
        binary: true
      }
    );
  }
}
