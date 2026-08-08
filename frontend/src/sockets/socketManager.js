import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../utils/constants';

class SocketManager {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket) return;
    // Assuming backend is served on same host/port in prod or proxy in dev
    this.socket = io('/', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

const socketManager = new SocketManager();
export default socketManager;
