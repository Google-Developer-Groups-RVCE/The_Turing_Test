import React, { createContext, useEffect, useContext } from 'react';
import socketManager from '../sockets/socketManager';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (user && token) {
      socketManager.connect(token);
    } else {
      socketManager.disconnect();
    }
    
    return () => {
      // Disconnecting on unmount might not be desired if it's the root, but good practice
      // socketManager.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socketManager}>
      {children}
    </SocketContext.Provider>
  );
};
