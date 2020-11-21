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

//@WebSocketGateway(3001, { transports: ['websocket'] })
//@WebSocketGateway(3001, { path: '/asdf' })
@WebSocketGateway(3001)
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger(this.constructor.name);
  
  // TODO client service that tracks number of users
  private clients = [];
  
  constructor(private videoStreamService: RaspiVideoStreamService) {
  }
  
  afterInit(server: any): any {
    this.logger.log('AppGateway initialized');
  }
  
  handleConnection(client: Socket, ...args: any[]): any {
    this.logger.log('connection');
    this.clients.push(client);
    this.videoStreamService.getCapture()
      .subscribe(
        data => client.emit('video-chunk', data),
        error => client.emit('video-error', '')
      );
  }
  
  handleDisconnect(client: Socket): any {
    this.logger.log('disconnect');
    const found = this.clients.find(c => c.id === client.id);
    if (found) {
      this.clients = this.clients.splice(found, 1);
    }
  }
}
