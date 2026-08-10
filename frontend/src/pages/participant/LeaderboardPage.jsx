import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { EventStateContext } from '../../contexts/EventStateContext';
import { SOCKET_EVENTS } from '../../utils/constants';
import { getLeaderboard } from '../../api/leaderboardApi';
import { Trophy, Medal, Crown } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const { currentRound, activeStage, eventStatus } = useContext(EventStateContext);
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto-navigate away when admin disables leaderboard view
  useEffect(() => {
    const isSim = window.location.pathname.startsWith('/simulation');
    const basePath = isSim ? '/simulation' : '/participant';
    if (activeStage !== 'leaderboard' && eventStatus !== 'ended') {
      if (currentRound && (currentRound.status === 'active' || eventStatus === 'running')) {
        navigate(`${basePath}/round`, { replace: true });
      } else {
        navigate(basePath, { replace: true });
      }
    }
  }, [activeStage, currentRound, eventStatus, navigate]);

  const fetchLeaderboard = async () => {
    try {
      const res = await getLeaderboard();
      setEntries(res.data.leaderboard || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Live updates via socket
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data) => {
      if (data.leaderboard) setEntries(data.leaderboard);
    };
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleUpdate);
    return () => socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleUpdate);
  }, [socket]);

  const getMedalIcon = (rank) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-400" />;
    if (rank === 2) return <Medal size={18} className="text-slate-300" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return null;
  };

  const getRankStyle = (rank, username) => {
    const isMe = username === user?.username;
    if (rank === 1) return 'border-yellow-500/30 bg-gradient-to-r from-yellow-900/20 to-transparent';
    if (rank === 2) return 'border-slate-400/30 bg-gradient-to-r from-slate-700/20 to-transparent';
    if (rank === 3) return 'border-amber-600/30 bg-gradient-to-r from-amber-900/20 to-transparent';
    if (isMe) return 'border-primary-500/40 bg-primary-900/20';
    return 'border-dark-700';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col py-4 space-y-6 max-w-3xl mx-auto w-full">
      <div className="text-center">
        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/20 mb-4 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
          <Trophy size={36} className="text-yellow-400" />
        </div>
        <h1 className="font-['Borghan'] text-3xl md:text-5xl font-bold text-white mb-2 tracking-wide">Live Leaderboard</h1>
        <p className="text-sm text-slate-400 mb-7 italic">Live rankings — updated in real time</p>
      </div>

      {entries.length === 0 ? (
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-md text-center py-12 flex flex-col items-center">
          <Trophy size={40} className="text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No scores yet. Answers are being tallied...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const rank = index + 1;
            const isMe = entry.username === user?.username;
            return (
              <div
                key={entry.username}
                className={`flex items-center space-x-4 px-6 py-4 rounded-2xl border transition-all shadow-lg backdrop-blur-md
                  ${getRankStyle(rank, entry.username)}
                  ${isMe ? 'ring-2 ring-primary-500/50 scale-[1.02]' : 'hover:bg-white/5'}
                `}
              >
                <div className="w-8 flex items-center justify-center shrink-0">
                  {getMedalIcon(rank) || (
                    <span className="text-slate-400 font-bold text-lg font-mono">{rank}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-0.5">
                    <span className={`font-bold text-lg truncate tracking-wide ${isMe ? 'text-primary-300' : 'text-white'}`}>
                      {entry.name || entry.username}
                    </span>
                    {isMe && (
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-primary-900/80 text-primary-400 rounded-full border border-primary-500/40 flex-shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{entry.username}</div>
                </div>
                <div className="text-right flex-shrink-0 bg-dark-900/50 px-4 py-2 rounded-xl border border-glass-border">
                  <div className={`text-xl font-bold font-mono tracking-wider ${rank === 1 ? 'text-yellow-400 text-shadow-sm' : rank === 2 ? 'text-slate-200' : rank === 3 ? 'text-amber-500' : 'text-white'}`}>
                    {entry.score}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
