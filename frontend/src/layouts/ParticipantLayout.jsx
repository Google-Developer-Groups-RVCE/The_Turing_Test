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
        <header className="fixed top-0 inset-x-0 h-16 bg-[#0a111a] border-b border-white/10 flex items-center justify-between px-4 sm:px-6 z-50 shadow-lg">
          <div className="flex items-center space-x-3">
            <img src="/reference/gdg_symbol.png" alt="GDG Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold text-white tracking-wide">The Turing Test</h1>
            <span className={`hidden sm:inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              eventStatus === 'running' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' :
              eventStatus === 'paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
              'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {eventStatus}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm hidden sm:flex items-center space-x-2">
              <span className="text-slate-400">Welcome, </span>
              <span className="font-semibold text-white">{user.name || user.username}</span>
            </div>
            <button onClick={logout} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors" title="Logout">
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
