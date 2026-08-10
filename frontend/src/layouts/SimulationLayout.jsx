import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { EventStateContext } from '../contexts/EventStateContext';
import { LogOut } from 'lucide-react';

export default function SimulationLayout() {
  const { eventStatus } = useContext(EventStateContext) || { eventStatus: 'idle' };

  // Hardcode a mock user for the simulation to guarantee it never hits real auth logic
  const mockUser = {
    username: 'simulated_user',
    name: 'Simulation Mode',
    role: 'participant',
  };

  return (
    <AuthContext.Provider value={{ user: mockUser, loading: false, logout: () => {} }}>
      <div className="page-bg" />
      <div className="page-wrap">
        <header className="fixed top-0 inset-x-0 h-16 bg-[#0a111a]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 sm:px-6 z-50 shadow-lg">
          <div className="flex items-center space-x-3">
            <img src="/reference/gdg_symbol.png" alt="GDG Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Cutepunch, sans-serif' }}>The Turing Test</h1>
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
              <span className="font-semibold text-white">{mockUser.name}</span>
            </div>
            <button disabled className="p-2 rounded-lg bg-white/5 opacity-50 cursor-not-allowed text-slate-300" title="Disabled in Simulation">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-grow w-full flex flex-col pt-20 pb-10 px-4 items-center">
          <Outlet />
        </main>
      </div>
    </AuthContext.Provider>
  );
}
