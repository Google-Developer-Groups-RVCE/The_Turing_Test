export const API_BASE_URL = '/api';

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
