import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.token = null;
  }

  connect(token) {
    if (this.socket) {
      if (this.token === token && this.socket.connected) return;
      this.disconnect();
    }
    this.token = token;
    this.socket = io('/', {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  isConnected() {
    return !!(this.socket && this.socket.connected);
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
