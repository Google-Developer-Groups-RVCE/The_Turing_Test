// VITE_API_URL is injected at build time (see frontend/Dockerfile ARG).
//   - Render Static Site: set to the live backend URL, e.g. "https://turing-backend.onrender.com"
//   - Local Docker Compose: empty string → Nginx proxies /api/* to the backend container
const _backendUrl = import.meta.env.VITE_API_URL || '';

export const API_BASE_URL = `${_backendUrl}/api`;

// Socket.IO must connect to the backend origin, not to '/' when cross-origin
export const SOCKET_URL = _backendUrl || undefined; // undefined → same-origin (local Nginx proxy)


export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
  ROUND_CHANGED: 'round:changed',
  ROUND_PAUSED: 'round:paused',
  ROUND_RESUMED: 'round:resumed',
  ROUND_ENDED: 'round:ended',
  EVENT_RESET: 'event:reset',
  EVENT_ENDED: 'event:ended',
  RESPONSE_SUBMITTED: 'response:submitted',
  RESPONSE_RECEIVED: 'response:received',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  ADMIN_NOTIFICATION: 'admin:notification',
  LOG_NEW: 'log:new'
};

export const ROLES = {
  ADMIN: 'admin',
  PARTICIPANT: 'participant'
};
