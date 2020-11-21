import { Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  WebSocketGateway 
} from '@nestjs/websockets';

import { Socket } from 'socket.io';
import { RaspiVideoStreamService } from './raspi-video-stream/raspi-video-stream.service'

// TODO: check these out
//@WebSocketGateway(3001, { transports: ['websocket'] })
//@WebSocketGateway(3001, { path: '/asdf' })
@WebSocketGateway(3001)
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger(this.constructor.name);
  
  // TODO client/connection service that tracks number of users
  private connections = [];
  
  constructor(private videoStreamService: RaspiVideoStreamService) {
  }
  
  afterInit(server: any): any {
    this.logger.log(`${this.constructor.name} initialized`);
  }
  
  handleConnection(socket: Socket, ...args: any[]): any {
    this.logger.log(`connected ${socket.id}`);
    const subscription = this.videoStreamService.getCapture()
      .subscribe(
        data => socket.emit('video-chunk', data),
        error => socket.emit('video-error', '')
      );
    this.connections.push({ socket, subscription });
    this.logger.log(this.connections);
  }
  
  handleDisconnect(socket: Socket): any {
    // socket.disconnect(true); // TODO: required?
    this.logger.log(`disconnected ${socket.id}`);
    const found = this.connections.find(c => c.socket.id === socket.id);
    if (found !== -1) {
      this.logger.log('cleaning up');
      const connection = this.connections[found];
      connection.subscription.unsubscribe();
      this.connections = this.connections.splice(found, 1);
      // TODO: unsubscribe from capture
      // TODO: check if socket needs to be closed
    }
  }
}
