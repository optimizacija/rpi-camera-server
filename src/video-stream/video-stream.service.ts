import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { Observable, Subject } from 'rxjs';
import { VideoStreamConfig } from './video-stream-config.model';

@Injectable()
export class VideoStreamService {
  
  private command = 'raspivid';
  private logger = new Logger(this.constructor.name);
  
  private capProcess: ChildProcess;
  private capSubject: Subject<Buffer>;
  
  // TODO: support live reload, read from file etc
  private config: VideoStreamConfig = {
    width: 960, // px
    height: 540, // px
    profile: 'baseline',
    framerate: 20,
  };
  
  getCapture(): Observable<Buffer> {
    if (this.isCapturing()) {
      return this.capSubject;
    }
    
    this._startCapture();
    return this.capSubject;
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
  }
  
  private _initState() {
    this.capSubject = new Subject<Buffer>();
    this.capProcess = spawn(this.command, [
      '--width', `${this.config.width}`,
      '--height', `${this.config.height}`,
      '--profile', `${this.config.profile}`,
      '--framerate', `${this.config.framerate}`,
      '--timeout', '0',
      '-o', '-',
    ]);
  }
  
  private _setupEvents() {
    // receive and forward video stream
    this.capProcess.stdout.on('data', data => {
      this.capSubject.next(data);
    });
    
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
}
