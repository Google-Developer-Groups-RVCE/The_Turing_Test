import React, { useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { EventStateContext } from '../contexts/EventStateContext';

export default function SimulationLayout() {
  const { eventStatus } = useContext(EventStateContext) || { eventStatus: 'idle' };

  // Ensure iframe inherits JWT token from parent admin window if available
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('token') && window.parent?.sessionStorage?.getItem('token')) {
        sessionStorage.setItem('token', window.parent.sessionStorage.getItem('token'));
      }
    } catch {
      /* cross-origin fallback */
    }
  }, []);

  // Hardcode a mock user for the simulation to guarantee it never hits real auth logic
  const mockUser = {
    username: 'simulated_user',
    name: 'Simulation Mode',
    role: 'participant',
  };

  return (
    <AuthContext.Provider value={{ user: mockUser, loading: false, logout: () => {} }}>
      <div className="min-h-screen w-full bg-[#0d1b2a] text-white flex flex-col items-center p-2 text-xs overflow-y-auto">
        <div className="w-full flex items-center justify-between py-1.5 px-2.5 mb-2 bg-dark-800/90 rounded-lg border border-white/10 text-[11px] shrink-0">
          <span className="font-semibold text-slate-300">Live Device Simulation</span>
          <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${
            eventStatus === 'running' ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' :
            eventStatus === 'paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {eventStatus}
          </span>
        </div>
        <main className="w-full flex-grow flex flex-col items-center justify-start">
          <Outlet />
        </main>
      </div>
    </AuthContext.Provider>
  );
}
