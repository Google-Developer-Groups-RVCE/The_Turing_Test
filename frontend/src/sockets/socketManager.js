import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.token = null;
    this.listeners = new Map(); // eventName -> Set<callback>
    this._heartbeatInterval = null;
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    // Send a no-op ping every 15s to keep connection alive through proxies/firewalls
    this._heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping_keepalive');
      }
    }, 15000);
  }

  _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }

  connect(token, query = {}) {
    if (this.socket && this.token === token && this.socket.connected) {
      return;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = token;
    this.socket = io('/', {
      auth: { token },
      query,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 45000,
    });

    this.socket.on('connect', () => {
      this._startHeartbeat();
    });

    this.socket.on('disconnect', () => {
      this._stopHeartbeat();
    });

    // Re-attach all registered event listeners to the new socket instance
    this.listeners.forEach((callbacks, eventName) => {
      callbacks.forEach((cb) => {
        this.socket.on(eventName, cb);
      });
    });
  }

  disconnect() {
    this._stopHeartbeat();
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
    if (!event || typeof callback !== 'function') return;

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (!event) return;

    if (callback && this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    } else if (!callback) {
      this.listeners.delete(event);
    }

    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
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
