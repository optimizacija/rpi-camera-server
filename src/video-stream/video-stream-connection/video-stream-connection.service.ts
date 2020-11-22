import { Injectable, Logger } from '@nestjs/common';
import { VideoStreamService } from '../video-stream.service'

import * as ws from 'ws';

@Injectable()
export class VideoStreamConnectionService {
  
  private logger: Logger = new Logger(this.constructor.name);
  private connections: any = new Map();
  
  constructor(private videoStreamService: VideoStreamService) {}
  
  add(socketId: string, remoteAddr: string, socket: ws) {
    const subscription = this.videoStreamService.getCapture()
      .subscribe(
        data => socket.send(data),
        error => socket.terminate()
      );
      
    this.connections.set(socketId, { subscription, remoteAddr });
    this.logger.log(`Added connection ${remoteAddr} | ${socketId}`);
  }
  
  remove(socketId: string) {
    const {subscription, remoteAddr} = this.connections.get(socketId);
    if (subscription) {
      subscription.unsubscribe();
      this.connections.delete(socketId);
      this.logger.log(`Removed connection ${remoteAddr} | ${socketId}}`);
      
      this._tryKillingVideoStream();
    } else {
      this.logger.error(`Failed to remove connection (not found) ${remoteAddr} | ${socketId}`);
    }
  }
  
  private _tryKillingVideoStream() {
    // if there's no listeners, there's no need to capture video stream
    if (this.connections.length === 0) {
      this.videoStreamService.killCapture();
    }
  }
}
