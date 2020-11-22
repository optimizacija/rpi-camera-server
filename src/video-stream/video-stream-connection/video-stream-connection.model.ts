import { Subscription } from 'rxjs';
import { Socket } from 'socket.io';

export interface VideoStreamConnection {
  socket: Socket;
  subscription: Subscription;
}
