import React, { useContext, useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Trophy, Sparkles } from 'lucide-react';
import { ROLES, SOCKET_EVENTS } from '../utils/constants';
import { EventStateContext } from '../contexts/EventStateContext';
import { useSocket } from '../hooks/useSocket';
import { getMyScore } from '../api/leaderboardApi';

export default function ParticipantLayout() {
  const { user, loading, logout } = useAuth();
  const { eventStatus } = useContext(EventStateContext) || { eventStatus: 'idle' };
  const socket = useSocket();
  const location = useLocation();

  const [totalScore, setTotalScore] = useState(0);
  const [userRank, setUserRank] = useState(null);

  const querySimulation = new URLSearchParams(location.search).get('isSimulation') === 'true';
  if (querySimulation) {
    sessionStorage.setItem('isSimulation', 'true');
  }
  const isSimulation = querySimulation || sessionStorage.getItem('isSimulation') === 'true';

  useEffect(() => {
    if (!user) return;
    const fetchScore = async () => {
      try {
        const res = await getMyScore();
        if (res?.data) {
          setTotalScore(res.data.totalScore || 0);
          setUserRank(res.data.rank || null);
        }
      } catch {}
    };
    fetchScore();

    if (!socket) return;
    const handleLeaderboardUpdate = (data) => {
      if (data?.leaderboard && Array.isArray(data.leaderboard)) {
        const found = data.leaderboard.find(e => e.username === user.username);
        if (found) {
          setTotalScore(found.score || 0);
          setUserRank(found.rank || null);
        }
      }
    };
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboardUpdate);
    return () => {
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboardUpdate);
    };
  }, [user, socket]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === ROLES.ADMIN && !isSimulation) return <Navigate to="/admin" replace />;

  return (
    <>
      <div className="page-bg" />
      <div className="page-wrap">
        <header className="fixed top-0 inset-x-0 h-16 bg-[#0a101d] border-b border-slate-700/80 flex items-center justify-between px-4 sm:px-6 z-50 shadow-2xl">
          {/* Left Brand Area */}
          <div className="flex items-center space-x-3.5">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-600/80 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <img src="/reference/gdg_symbol.png" alt="GDG Logo" className="w-8 h-8 object-contain drop-shadow" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
                  The Turing Test
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono tracking-wider">
                  GDG RVCE
                </span>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-700 mx-1 hidden md:block" />

            {/* Event Status Live Pill */}
            <div className={`hidden sm:inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              eventStatus === 'running' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]' :
              eventStatus === 'paused' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]' :
              'bg-slate-800/80 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                eventStatus === 'running' ? 'bg-emerald-400 animate-pulse' :
                eventStatus === 'paused' ? 'bg-amber-400' : 'bg-slate-500'
              }`} />
              <span>{eventStatus}</span>
            </div>
          </div>

          {/* Right User & Total Points Area */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Total Points Pill */}
            <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/40 rounded-xl py-1 px-3 shadow-[0_0_12px_rgba(245,158,11,0.15)]" title="Total Points Accumulated">
              <Trophy size={15} className="text-amber-400 animate-bounce" />
              <div className="flex items-baseline space-x-1 font-mono">
                <span className="text-sm font-extrabold text-amber-300">{totalScore}</span>
                <span className="text-[10px] font-bold text-amber-400/80 uppercase">pts</span>
              </div>
              {userRank && (
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded ml-0.5">
                  #{userRank}
                </span>
              )}
            </div>

            {/* User Chip */}
            <div className="flex items-center space-x-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl py-1 px-3 shadow-inner">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                {(user.name || user.username).charAt(0)}
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white">{user.name || user.username}</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 transition-all duration-200"
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
