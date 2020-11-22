import { Injectable, Logger } from '@nestjs/common';
import { VideoStreamService } from '../video-stream.service'
import { VideoStreamConnection } from './video-stream-connection.model'

import { Socket } from 'socket.io';
import { socketToString } from '../../misc/formatting';

@Injectable()
export class VideoStreamConnectionService {
  
  private logger: Logger = new Logger(this.constructor.name);
  private connections: VideoStreamConnection[] = [];
  private messageNames = {
    chunk: 'video-chunk',
    error: 'video-error'
  }
  
  constructor(private videoStreamService: VideoStreamService) {}
  
  add(socket: Socket) {
    const subscription = this.videoStreamService.getCapture()
      .subscribe(
        // TODO fixed size chunks
        data => socket.emit(this.messageNames.chunk, data),
        error => socket.emit(this.messageNames.error, '')
      );
      
    this.connections.push({ socket, subscription });
    this.logger.log(`Added connection ${socketToString(socket)}`);
  }
  
  remove(socket: Socket) {
    // socket.disconnect(true); // TODO: required?
    const found = this.connections.findIndex(c => c.socket.id === socket.id);
    if (found !== -1) {
      const connection = this.connections[found];
      connection.subscription.unsubscribe(); // TODO kill capture when no subscriptions are active
      this.connections.splice(found, 1);
      this.logger.log(`Removed connection ${socketToString(socket)}`);
      
      this._tryKillingVideoStream();
    } else {
      this.logger.error(`Failed to remove connection ${socketToString(socket)}`);
    }
  }
  
  private _tryKillingVideoStream() {
    // if there's no listeners, there's no need to capture video stream
    this.logger.debug(`connections size ${this.connections.length}`);
    if (this.connections.length === 0) {
      this.videoStreamService.killCapture();
    }
  }
}
