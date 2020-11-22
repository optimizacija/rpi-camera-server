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
import { VideoStreamConnectionService } from './video-stream-connection/video-stream-connection.service'
import { socketToString } from '../misc/formatting';

// TODO: check these out + namespace
//@WebSocketGateway(3001, { transports: ['websocket'] })
//@WebSocketGateway(3001, { path: '/asdf' })
@WebSocketGateway(3001)
export class VideoStreamGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger(this.constructor.name);
  
  constructor(private videoStreamConnectionService: VideoStreamConnectionService) {}
  
  afterInit(server: any): any {
    this.logger.log(`${this.constructor.name} initialized`);
  }
  
  handleConnection(socket: Socket, ...args: any[]): any {
    this.logger.log(`Received connection ${socketToString(socket)}`);
    this.videoStreamConnectionService.add(socket);
  }
  
  handleDisconnect(socket: Socket): any {
    this.logger.log(`Received disconnect ${socketToString(socket)}`);
    this.videoStreamConnectionService.remove(socket);
  }
}
