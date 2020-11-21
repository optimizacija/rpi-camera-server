import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class RaspiVideoStreamService {
  
  private command = 'raspivid';
  private logger = new Logger(this.constructor.name);
  
  private capProcess: ChildProcess;
  private capSubject: Subject<string>;
  
  constructor() {
    // TODO: remove
    const obs = this.getCapture();
    obs.subscribe(data => {
      this.logger.log(data.toString());
    }, error => {
      this.logger.error(error);
    });
  }
  
  getCapture(): Observable<string> {
    if (this.isCapturing()) {
      return this.capSubject;
    }
    
    this._startCapture();
    return this.capSubject;
  }
  
  killCapture() {
    this.capProcess.kill();
  }
  
  isCapturing(): boolean {
    return Boolean(this.capSubject) && Boolean(this.capProcess);
  }
  
  private _startCapture() {
    this._initState();
    this._setupEvents();
  }
  
  private _initState() {
    this.capSubject = new Subject<string>(); // TODO: change type to buffer?
    this.capProcess = spawn('ls', ['-lh', '/usr']);  // TODO: change process
  }
  
  private _setupEvents() {
    // receive and forward video stream
    this.capProcess.stdout.on('data', data => {
      this.capSubject.next(data);
    });
    
    // closing & exiting
    this.capProcess.on('close', code => {
      const message = `${this.command} closed all stdio with code ${code}`
      if (code == 0) {
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
