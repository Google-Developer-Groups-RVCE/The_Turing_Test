import React, { createContext, useEffect, useContext } from 'react';
import socketManager from '../sockets/socketManager';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (user && token) {
      // Parse query params safely from window.location
      const searchParams = window.location.search;
      const query = searchParams ? Object.fromEntries(new URLSearchParams(searchParams)) : {};
      socketManager.connect(token, query);
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
