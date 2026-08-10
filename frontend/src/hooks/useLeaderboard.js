import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';
import { SOCKET_EVENTS } from '../utils/constants';

export const useLeaderboard = (initialData = []) => {
  const [leaderboard, setLeaderboard] = useState(initialData);

  useSocket(SOCKET_EVENTS.LEADERBOARD_UPDATE, (data) => {
    if (data.leaderboard) {
      setLeaderboard(data.leaderboard);
    }
  });

  return leaderboard;
};
