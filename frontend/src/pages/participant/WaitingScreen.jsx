import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { EventStateContext } from '../../contexts/EventStateContext';
import {
  Brain, Clock, Wifi, WifiOff, Users, RefreshCw,
  Code, Sparkles, Award, ExternalLink
} from 'lucide-react';
import { SOCKET_EVENTS } from '../../utils/constants';
import { getHealth } from '../../api/settingsApi';

export default function WaitingScreen() {
  const { user } = useAuth();
  const socket = useSocket();
  const { currentRound, eventStatus, activeStage, syncState } = useContext(EventStateContext);
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(0);
  const [connected, setConnected] = useState(socket?.isConnected() || false);
  const [dots, setDots] = useState('');

  // Animate waiting dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Sync initial online count & track socket connection
  const syncHealth = useCallback(() => {
    getHealth()
      .then((res) => {
        const count = res.data?.socketIo?.participantsCount;
        if (typeof count === 'number') setOnlineCount(count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    syncHealth();
    const healthInterval = setInterval(syncHealth, 5000);

    if (!socket) return () => clearInterval(healthInterval);

    const checkConnection = () => {
      const isConn = socket.isConnected();
      setConnected(isConn);
    };
    checkConnection();
    const connInterval = setInterval(checkConnection, 1000);

    const handleConnect = () => {
      setConnected(true);
      syncHealth();
    };
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      clearInterval(healthInterval);
      clearInterval(connInterval);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket, syncHealth]);

  // Track real-time presence count broadcasts
  useEffect(() => {
    if (!socket) return;
    const handlePresence = (data) => {
      if (typeof data?.participantsCount === 'number') {
        setOnlineCount(data.participantsCount);
      }
    };
    socket.on(SOCKET_EVENTS.PRESENCE_ONLINE, handlePresence);
    socket.on(SOCKET_EVENTS.PRESENCE_OFFLINE, handlePresence);
    return () => {
      socket.off(SOCKET_EVENTS.PRESENCE_ONLINE, handlePresence);
      socket.off(SOCKET_EVENTS.PRESENCE_OFFLINE, handlePresence);
    };
  }, [socket]);

  // Auto-navigate to active round when currentRound is active
  useEffect(() => {
    const isSim = window.location.pathname.startsWith('/simulation');
    const basePath = isSim ? '/simulation' : '/participant';
    if (currentRound && (currentRound.status === 'active' || eventStatus === 'running')) {
      navigate(`${basePath}/round`, { replace: true });
    }
  }, [currentRound, eventStatus, navigate]);

  // Auto-navigate to leaderboard if admin enabled showLeaderboard
  useEffect(() => {
    const isSim = window.location.pathname.startsWith('/simulation');
    const basePath = isSim ? '/simulation' : '/participant';
    if (activeStage === 'leaderboard' || eventStatus === 'ended') {
      navigate(`${basePath}/leaderboard`, { replace: true });
    }
  }, [activeStage, eventStatus, navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center px-4 max-w-3xl mx-auto w-full">
      {/* GDG Club Header */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl scale-150 animate-pulse" />
        <div className="relative p-6 rounded-3xl bg-dark-800/60 border border-glass-border shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          </div>
          <Brain size={54} className="text-primary-400 mx-auto" />
        </div>
      </div>

      <h1 className="intro-title mb-2 tracking-tight">The Turing Test</h1>
      <p className="intro-subtitle max-w-lg mb-8">
        Test your problem-solving, logic, and speed.
      </p>

      {/* Socket Connection Badge */}
      <div className="flex items-center space-x-2 mb-10 bg-dark-900/60 px-4 py-2 rounded-full border border-dark-700 backdrop-blur-sm">
        <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-primary-500 animate-pulse' : 'bg-rose-500'}`} />
        <span className={`text-sm font-medium ${connected ? 'text-primary-400' : 'text-rose-400'}`}>
          {connected ? 'Connected to Event Gateway' : 'Reconnecting...'}
        </span>
        {!connected && <WifiOff size={14} className="text-rose-400" />}
        {connected && <Wifi size={14} className="text-primary-400" />}
      </div>

      {/* Event Idle / Waiting State */}
      {eventStatus !== 'paused' && (
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md mb-8 text-center flex flex-col items-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Clock className="text-cyan-400 animate-spin-slow" size={26} />
            <h2 className="font-['Borghan'] text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide">Waiting for Round{dots}</h2>
          </div>
          <p className="text-sm text-slate-400 mb-7 italic">
            The GDG admin team will launch the next round shortly. Your screen will transition automatically when the round begins.
          </p>
        </div>
      )}

      {/* Paused State */}
      {eventStatus === 'paused' && (
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md mb-8 text-center border-yellow-500/30">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 rounded bg-yellow-500/20 flex items-center justify-center">
              <div className="w-1.5 h-3.5 bg-yellow-400 rounded mr-0.5" />
              <div className="w-1.5 h-3.5 bg-yellow-400 rounded" />
            </div>
            <h2 className="font-['Borghan'] text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide text-yellow-300">Round Paused</h2>
          </div>
          <p className="text-sm text-slate-400 mb-7 italic">Please stand by while the organizers pause the event timer.</p>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full mb-8">
        <div className="bg-dark-800/40 border border-glass-border rounded-xl p-4 text-center backdrop-blur-md">
          <Users size={20} className="text-primary-400 mb-2 mx-auto" />
          <div className="text-2xl font-bold text-white font-mono">{onlineCount}</div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Online</div>
        </div>
        <div className="bg-dark-800/40 border border-glass-border rounded-xl p-4 text-center backdrop-blur-md">
          <Code size={20} className="text-blue-400 mb-2 mx-auto" />
          <div className="text-sm font-bold text-white truncate">{user?.username}</div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Handle</div>
        </div>
        <div className="bg-dark-800/40 border border-glass-border rounded-xl p-4 text-center col-span-2 sm:col-span-1 backdrop-blur-md">
          <Award size={20} className="text-yellow-400 mb-2 mx-auto" />
          <div className="text-sm font-bold text-white">GDG RVCE</div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Organizer</div>
        </div>
      </div>

      <button
        onClick={syncState}
        className="relative overflow-hidden font-['Cutepunch'] text-xl tracking-widest py-3 px-10 rounded-full bg-gradient-to-br from-sky-400 via-sky-500 to-sky-400 text-white shadow-[0_4px_20px_rgba(14,165,233,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_8px_28px_rgba(14,165,233,0.65),inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ padding: '10px 30px', fontSize: '1rem', marginTop: '10px' }}
      >
        <span className="flex items-center space-x-2">
          <RefreshCw size={16} />
          <span>Sync Status</span>
        </span>
      </button>
    </div>
  );
}
