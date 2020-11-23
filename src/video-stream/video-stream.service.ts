import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { Observable, Subject } from 'rxjs';
import { VideoStreamConfig } from './video-stream-config.model';
import * as Splitter from 'stream-split';
import * as stream from 'stream';
import * as StreamConcat from 'stream-concat';
import { of, concat } from 'rxjs';

interface Packet {
  data: Buffer | string;
  binary: boolean;
}

@Injectable()
export class VideoStreamService {
  
  // general
  private command = 'raspivid';
  private logger = new Logger(this.constructor.name);
  
  private capProcess: ChildProcess;
  private capSubject: Subject<Packet>;
  
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
    this._formatStdout();
    
    this._setupEvents();
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
  
  private _formatStdout() {
    // shamelessly took from https://github.com/pimterry/raspivid-stream/blob/master/index.js
    const NALseparator = new Buffer([0,0,0,1]);
    
    const headerData = {
        _waitingStream: new stream.PassThrough(),
        _firstFrames: [],
        _lastIdrFrame: null,

        set idrFrame(frame) {
            this._lastIdrFrame = frame;

            if (this._waitingStream) {
                const waitingStream = this._waitingStream;
                this._waitingStream = null;
                this.getStream().pipe(waitingStream);
            }
        },

        addParameterFrame: function (frame) {
            this._firstFrames.push(frame)
        },

        getStream: function () {
            if (this._waitingStream) {
                return this._waitingStream;
            } else {
                const headersStream = new stream.PassThrough();
                this._firstFrames.forEach((frame) => headersStream.push(frame));
                headersStream.push(this._lastIdrFrame);
                headersStream.end();
                return headersStream;
            }
        }
    };
    
    new StreamConcat([
      headerData.getStream(), 
      this.capProcess.stdout
        .pipe(new Splitter(NALseparator))
        .pipe(new stream.Transform({ transform: function (chunk, encoding, callback) {
            const chunkWithSeparator = Buffer.concat([NALseparator, chunk]);

            const chunkType = chunk[0] & 0b11111;
            let chunkName = 'unknown';

            // Capture the first SPS & PPS frames, so we can send stream parameters on connect.
            if (chunkType === 7 || chunkType === 8) {
                headerData.addParameterFrame(chunkWithSeparator);
                chunkName = chunkType === 7 ? 'SPS' : 'PPS';
            } else {
                // The live stream only includes the non-parameter chunks
                this.push(chunkWithSeparator);

                // Keep track of the latest IDR chunk, so we can start clients off with a near-current image
                if (chunkType === 5) {
                    chunkName = 'IDR';
                    headerData.idrFrame = chunkWithSeparator;
                }
            }
            
            
            if (chunkType !== 1) {
              console.log(`${chunkName}[${chunkType}]: ${chunk.length}`);
            }

            callback();
        }}))
    ])
      .on('data', data => {
        this.capSubject.next({ data, binary: true });
      });
  }
  
  private _setupEvents() {
    // receive and forward video stream
    //this.capProcess.stdout.on('data', data => {
      //this.capSubject.next(data);
    //});
    
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
      return of({ 
        data: JSON.stringify({
          action: 'init',
          width: this.config.width,
          height: this.config.height
        }),
        binary: false
      });
  }
}
