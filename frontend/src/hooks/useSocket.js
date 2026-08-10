import { useContext, useEffect } from 'react';
import { SocketContext } from '../contexts/SocketContext';

export const useSocket = (eventName, callback) => {
  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket || !eventName || !callback) return;

    socket.on(eventName, callback);

    return () => {
      socket.off(eventName, callback);
    };
  }, [socket, eventName, callback]);

  return socket;
};
