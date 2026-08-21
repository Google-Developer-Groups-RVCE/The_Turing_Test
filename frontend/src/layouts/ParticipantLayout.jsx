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
        <header className="fixed top-0 inset-x-0 h-16 bg-[#0b1320]/95 border-b border-slate-700/60 flex items-center justify-between px-4 sm:px-6 z-50 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 shadow-inner">
              <img src="/reference/gdg_symbol.png" alt="GDG Logo" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text">
                  The Turing Test
                </h1>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/30 text-primary-400 font-mono">
                  GDG RVCE
                </span>
              </div>
            </div>
            <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />
            <div className={`hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              eventStatus === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
              eventStatus === 'paused' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
              'bg-slate-800/80 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                eventStatus === 'running' ? 'bg-emerald-400 animate-pulse' :
                eventStatus === 'paused' ? 'bg-amber-400' : 'bg-slate-500'
              }`} />
              <span>{eventStatus}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl py-1 px-3 shadow-inner">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                {(user.name || user.username).charAt(0)}
              </div>
              <div className="text-xs">
                <span className="text-slate-400 hidden md:inline">Participant: </span>
                <span className="font-semibold text-white">{user.name || user.username}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 transition-all duration-200"
              title="Logout"
            >
              <LogOut size={16} />
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
