import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { EventStateProvider } from './contexts/EventStateContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <EventStateProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </EventStateProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
