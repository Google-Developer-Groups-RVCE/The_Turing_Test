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
  const { currentRound, eventStatus, showLeaderboard, syncState } = useContext(EventStateContext);
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
        const count = res.data?.socketIo?.connectedClients;
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
      if (typeof data?.onlineCount === 'number') {
        setOnlineCount(data.onlineCount);
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
    if (currentRound && (currentRound.status === 'active' || eventStatus === 'running')) {
      navigate('/participant/round', { replace: true });
    }
  }, [currentRound, eventStatus, navigate]);

  // Auto-navigate to leaderboard if admin enabled showLeaderboard
  useEffect(() => {
    if (showLeaderboard || eventStatus === 'ended') {
      navigate('/participant/leaderboard', { replace: true });
    }
  }, [showLeaderboard, eventStatus, navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center px-4 max-w-3xl mx-auto w-full">
      {/* GDG Club Header */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-red-500/20 to-yellow-500/20 blur-3xl scale-150 animate-pulse" />
        <div className="relative p-6 rounded-3xl bg-dark-800/80 border border-dark-700 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          </div>
          <Brain size={54} className="text-primary-400 mx-auto" />
        </div>
      </div>

      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary-950/60 border border-primary-500/30 text-primary-400 text-xs font-semibold uppercase tracking-wider mb-3">
        <Sparkles size={14} />
        <span>GDG RVCE · Student Club</span>
      </div>

      <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">The Turing Test</h1>
      <p className="text-slate-400 text-base max-w-lg mb-4">
        Welcome to GDG Club's flagship Student Induction Program. Test your problem-solving, logic, and speed.
      </p>

      {/* Socket Connection Badge */}
      <div className="flex items-center space-x-2 mb-8">
        <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-primary-500 animate-pulse' : 'bg-rose-500'}`} />
        <span className={`text-sm font-medium ${connected ? 'text-primary-400' : 'text-rose-400'}`}>
          {connected ? 'Connected to Event Gateway' : 'Reconnecting...'}
        </span>
        {!connected && <WifiOff size={14} className="text-rose-400" />}
        {connected && <Wifi size={14} className="text-primary-400" />}
      </div>

      {/* Event Idle / Waiting State */}
      {eventStatus !== 'paused' && (
        <div className="card w-full mb-6 border-dark-700 bg-dark-800/70">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <Clock className="text-primary-400 animate-spin-slow" size={22} />
            <h2 className="text-lg font-semibold text-white">Waiting for Round to Start{dots}</h2>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            The GDG admin team will launch the next round shortly. Your screen will transition automatically when the round begins.
          </p>
        </div>
      )}

      {/* Paused State */}
      {eventStatus === 'paused' && (
        <div className="card w-full mb-6 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <div className="w-5 h-5 rounded bg-yellow-500/20 flex items-center justify-center">
              <div className="w-1 h-3 bg-yellow-400 rounded mr-0.5" />
              <div className="w-1 h-3 bg-yellow-400 rounded" />
            </div>
            <h2 className="text-lg font-semibold text-yellow-300">Round Paused by Admin</h2>
          </div>
          <p className="text-slate-400 text-sm">Please stand by while the organizers pause the event timer.</p>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mb-6">
        <div className="bg-dark-800/60 border border-dark-700 rounded-xl p-4 text-center">
          <Users size={18} className="text-primary-400 mb-1 mx-auto" />
          <div className="text-2xl font-bold text-white font-mono">{onlineCount}</div>
          <div className="text-xs text-slate-500 font-medium">Online Participants</div>
        </div>
        <div className="bg-dark-800/60 border border-dark-700 rounded-xl p-4 text-center">
          <Code size={18} className="text-blue-400 mb-1 mx-auto" />
          <div className="text-sm font-semibold text-white truncate">{user?.username}</div>
          <div className="text-xs text-slate-500 font-medium">Your Handle</div>
        </div>
        <div className="bg-dark-800/60 border border-dark-700 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <Award size={18} className="text-yellow-400 mb-1 mx-auto" />
          <div className="text-sm font-semibold text-white">GDG RVCE</div>
          <div className="text-xs text-slate-500 font-medium">Organizer</div>
        </div>
      </div>

      <button
        onClick={syncState}
        className="flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 px-4 rounded-lg bg-dark-800 border border-dark-700"
      >
        <RefreshCw size={13} />
        <span>Check Active Round</span>
      </button>
    </div>
  );
}
