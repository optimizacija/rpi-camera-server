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

// TODO: set path & namespace
@WebSocketGateway(3001, {
  serveClient: false,
  // path: '/api/video-stream', // socket.io endpoint
  // namespace: '/video-stream' 
})
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
