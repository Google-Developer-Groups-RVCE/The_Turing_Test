import React, { useContext } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut } from 'lucide-react';
import { ROLES } from '../utils/constants';
import { EventStateContext } from '../contexts/EventStateContext';

export default function ParticipantLayout() {
  const { user, loading, logout } = useAuth();
  const { eventStatus } = useContext(EventStateContext) || { eventStatus: 'idle' };
  const location = useLocation();

  const querySimulation = new URLSearchParams(location.search).get('isSimulation') === 'true';
  if (querySimulation) {
    sessionStorage.setItem('isSimulation', 'true');
  }
  const isSimulation = querySimulation || sessionStorage.getItem('isSimulation') === 'true';

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === ROLES.ADMIN && !isSimulation) return <Navigate to="/admin" replace />;

  return (
    <>
      <div className="page-bg" />
      <div className="page-wrap">
        <header className="top-nav">
          <div className="nav-left">
            <img src="/reference/gdg_symbol.png" alt="GDG Logo" className="gdg-symbol" />
            <h1 className="nav-title">The Turing Test</h1>
            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              eventStatus === 'running' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' :
              eventStatus === 'paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {eventStatus}
            </span>
          </div>
          <div className="nav-right">
            <div className="text-sm hidden sm:flex items-center space-x-2">
              <span className="text-slate-400">Welcome, </span>
              <span className="font-semibold text-white">{user.name || user.username}</span>
            </div>
            <button onClick={logout} className="btn-fullscreen p-2 text-slate-300 hover:text-white" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-grow w-full flex flex-col pt-20 pb-10 px-4 items-center">
          <Outlet />
        </main>
      </div>
    </>
  );
}
