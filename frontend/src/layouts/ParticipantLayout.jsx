import React, { useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut } from 'lucide-react';
import { ROLES } from '../utils/constants';
import { EventStateContext } from '../contexts/EventStateContext';

export default function ParticipantLayout() {
  const { user, loading, logout } = useAuth();
  const { eventStatus } = useContext(EventStateContext) || { eventStatus: 'idle' };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === ROLES.ADMIN) return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="bg-dark-800 border-b border-dark-700 p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-emerald-300">
              The Turing Test
            </h1>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              eventStatus === 'running' ? 'bg-primary-900 text-primary-400' :
              eventStatus === 'paused' ? 'bg-yellow-900 text-yellow-400' :
              'bg-slate-800 text-slate-400'
            }`}>
              {eventStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-slate-400">Welcome, </span>
              <span className="font-semibold text-white">{user.name || user.username}</span>
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-white transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-grow p-4 max-w-4xl mx-auto w-full flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
