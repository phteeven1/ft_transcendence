import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '@/lib/api/config';

type SocketEntry = {
  socket: Socket;
  refs: number;
};

const sockets = new Map<string, SocketEntry>();

export function acquireSocket(key: string): Socket {
  const existing = sockets.get(key);
  if (existing) {
    existing.refs += 1;
    return existing.socket;
  }

  const socket = io(getSocketUrl(), { transports: ['websocket'] });
  sockets.set(key, { socket, refs: 1 });
  return socket;
}

export function releaseSocket(key: string): void {
  const existing = sockets.get(key);
  if (!existing) return;

  existing.refs -= 1;
  queueMicrotask(() => {
    const current = sockets.get(key);
    if (!current || current.refs > 0) return;
    current.socket.disconnect();
    sockets.delete(key);
  });
}
