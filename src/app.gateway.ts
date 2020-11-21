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

//@WebSocketGateway(3001, { transports: ['websocket'] })
//@WebSocketGateway(3001, { path: '/asdf' })
@WebSocketGateway(3001)
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger('AppGateway');
  
  afterInit(server: any): any {
    this.logger.log('AppGateway initialized');
  }
  
  handleConnection(client: any, ...args: any[]): any {
    this.logger.log('connection');
  }
  
  handleDisconnect(client: any): any {
    this.logger.log('disconnect');
  }
    
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    this.logger.log(payload);
    return 'Hello world!';
  }
}
