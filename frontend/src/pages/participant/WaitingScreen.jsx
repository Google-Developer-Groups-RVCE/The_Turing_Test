import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { EventStateContext } from '../../contexts/EventStateContext';
import { Brain, Clock, Wifi, WifiOff, Users, RefreshCw } from 'lucide-react';
import { SOCKET_EVENTS } from '../../utils/constants';
import { getCurrentRound } from '../../api/roundApi';
import { getHealth } from '../../api/settingsApi';

export default function WaitingScreen() {
  const { user } = useAuth();
  const socket = useSocket();
  const { currentRound, eventStatus } = useContext(EventStateContext);
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
    if (!socket) return;

    if (socket.isConnected()) {
      setConnected(true);
    }

    const handleConnect = () => {
      setConnected(true);
      syncHealth();
    };
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    return () => {
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

  // Auto-navigate when a round becomes active
  useEffect(() => {
    if (currentRound && eventStatus === 'running') {
      navigate('/participant/round');
    }
  }, [currentRound, eventStatus, navigate]);

  // On mount: check if a round is already active (for reconnect scenario)
  const checkCurrentRound = useCallback(async () => {
    try {
      const res = await getCurrentRound();
      const r = res.data?.round || (res.data?.id ? res.data : null);
      if (r && r.status === 'active') {
        navigate('/participant/round');
      }
    } catch {
      // No active round, stay on waiting screen
    }
  }, [navigate]);

  useEffect(() => {
    checkCurrentRound();
  }, [checkCurrentRound]);

  // Redirect if event ended
  useEffect(() => {
    if (eventStatus === 'ended') {
      navigate('/participant/leaderboard');
    }
  }, [eventStatus, navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Hero */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary-500/20 blur-3xl scale-150 animate-pulse" />
        <div className="relative p-6 rounded-3xl bg-gradient-to-br from-dark-800 to-dark-900 border border-primary-500/20 shadow-2xl shadow-primary-500/10">
          <Brain size={60} className="text-primary-400 mx-auto" />
        </div>
      </div>

      <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">The Turing Test</h1>
      <p className="text-slate-400 text-lg mb-2">GDG RVCE Student Induction Program</p>

      <div className="flex items-center space-x-2 mb-10">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-primary-500 animate-pulse' : 'bg-rose-500'}`} />
        <span className={`text-sm font-medium ${connected ? 'text-primary-400' : 'text-rose-400'}`}>
          {connected ? 'Connected' : 'Reconnecting...'}
        </span>
        {!connected && <WifiOff size={14} className="text-rose-400" />}
        {connected && <Wifi size={14} className="text-primary-400" />}
      </div>

      {/* Waiting State */}
      {eventStatus !== 'paused' && (
        <div className="card max-w-md w-full mb-6">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Clock className="text-primary-400 animate-spin-slow" size={24} />
            <h2 className="text-xl font-semibold text-white">Waiting for Round to Start{dots}</h2>
          </div>
          <p className="text-slate-400 text-sm">
            The admin will start the event shortly. Your device will automatically transition when the round begins.
            No refresh needed!
          </p>
        </div>
      )}

      {/* Paused State */}
      {eventStatus === 'paused' && (
        <div className="card max-w-md w-full mb-6 border-yellow-500/30">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 rounded bg-yellow-500/20 flex items-center justify-center">
              <div className="w-1.5 h-4 bg-yellow-400 rounded" style={{ marginRight: '2px' }} />
              <div className="w-1.5 h-4 bg-yellow-400 rounded" />
            </div>
            <h2 className="text-xl font-semibold text-yellow-300">Event Paused</h2>
          </div>
          <p className="text-slate-400 text-sm">The admin has paused the event. Please wait for it to resume.</p>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 max-w-md w-full mt-2">
        <div className="bg-dark-800/60 border border-dark-700 rounded-xl p-4">
          <Users size={20} className="text-primary-400 mb-2 mx-auto" />
          <div className="text-2xl font-bold text-white">{onlineCount}</div>
          <div className="text-xs text-slate-500">Online Now</div>
        </div>
        <div className="bg-dark-800/60 border border-dark-700 rounded-xl p-4">
          <div className="text-sm font-semibold text-primary-400 mb-2 truncate">{user?.username}</div>
          <div className="text-xs text-slate-500">Your Username</div>
          <div className="mt-1 text-xs text-slate-600 truncate">{user?.name || user?.username}</div>
        </div>
      </div>

      <button
        onClick={checkCurrentRound}
        className="mt-6 flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <RefreshCw size={14} />
        <span>Check for active round</span>
      </button>
    </div>
  );
}
