import { Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';

//import { Server } from 'ws';
import * as ws from 'ws';
import { VideoStreamConnectionService } from './video-stream-connection/video-stream-connection.service'
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway(3001, {
  serveClient: false,
  path: '/api/video-stream'
})
export class VideoStreamGateway implements OnGatewayInit, OnGatewayConnection {
  private logger: Logger = new Logger(this.constructor.name);
  
  @WebSocketServer()
  server: ws.Server;
  
  constructor(private videoStreamConnectionService: VideoStreamConnectionService) {
  }
  
  afterInit(server: any): any {
    this.logger.log(`${this.constructor.name} initialized`);
  }
  
  handleConnection(socket: ws, args: any): any {
    const socketId = uuidv4();
    const remoteAddr = args.connection.remoteAddress;
    this.logger.log(`Received connection: ${remoteAddr} | ${socketId}`);
    this.videoStreamConnectionService.add(socketId, remoteAddr, socket);
    console.log(args.connection);
    
    // handle disconnect here, so that we can assign ids to sockets
    socket.on('close', (code, reason) => {
      this.logger.log(`Received disconnect: ${remoteAddr} | ${socketId}`); 
      this.videoStreamConnectionService.remove(socketId);
    });
  }
}
