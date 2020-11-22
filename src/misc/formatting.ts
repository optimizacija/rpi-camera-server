import { Socket } from 'socket.io';

export function socketToString(socket: Socket) {
  return `${socket.handshake.address}: ${socket.id}`;
}
