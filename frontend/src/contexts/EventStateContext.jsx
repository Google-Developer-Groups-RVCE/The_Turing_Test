import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { SocketContext } from './SocketContext';
import { SOCKET_EVENTS } from '../utils/constants';
import { getCurrentRound } from '../api/roundApi';
import { getSettings } from '../api/settingsApi';

export const EventStateContext = createContext(null);

export const EventStateProvider = ({ children }) => {
  const socket = useContext(SocketContext);
  const [currentRound, setCurrentRound] = useState(null);
  const [eventStatus, setEventStatus] = useState('idle'); // idle, running, paused, ended
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeStage, setActiveStage] = useState('question'); // question or leaderboard

  // Fetch initial round & settings state on mount
  const syncState = useCallback(async () => {
    try {
      const [rRes, sRes] = await Promise.allSettled([
        getCurrentRound(),
        getSettings()
      ]);

      if (rRes.status === 'fulfilled') {
        const r = rRes.value.data?.round || (rRes.value.data?.id ? rRes.value.data : null);
        if (r) {
          setCurrentRound(r);
          setEventStatus(r.status === 'active' ? 'running' : r.status === 'paused' ? 'paused' : 'idle');
        } else {
          setCurrentRound(null);
          setEventStatus('idle');
        }
      }

      if (sRes.status === 'fulfilled') {
        const settings = sRes.value.data;
        if (settings) {
          setShowLeaderboard(String(settings.showLeaderboard) === 'true');
        }
      }

      if (rRes.status === 'fulfilled' && rRes.value.data?.round) {
        const stageRes = await require('../api/axiosClient').default.get(`/rounds/${rRes.value.data.round.id}/stage`);
        if (stageRes.data?.stage) {
          setActiveStage(stageRes.data.stage);
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    syncState();
  }, [syncState]);

  useEffect(() => {
    if (!socket) return;

    const handleRoundChanged = (data) => {
      const r = data?.roundData || (data?.roundId ? { id: data.roundId, status: 'active' } : null);
      setCurrentRound(r);
      setEventStatus('running');
    };

    const handleRoundPaused = () => setEventStatus('paused');
    const handleRoundResumed = () => setEventStatus('running');
    const handleRoundEnded = () => {
      setCurrentRound(null);
      setEventStatus('idle');
      setActiveStage('question');
    };
    const handleEventReset = () => {
      setCurrentRound(null);
      setEventStatus('idle');
      setActiveStage('question');
    };
    const handleEventEnded = () => setEventStatus('ended');

    const handleStageChanged = (data) => {
      if (data?.activeStage) setActiveStage(data.activeStage);
    };

    const handleLeaderboardToggle = (data) => {
      if (typeof data?.showLeaderboard === 'boolean') {
        setShowLeaderboard(data.showLeaderboard);
      }
    };

    const handleSettingsUpdated = (settings) => {
      if (settings?.showLeaderboard !== undefined) {
        setShowLeaderboard(String(settings.showLeaderboard) === 'true');
      }
    };

    socket.on(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
    socket.on(SOCKET_EVENTS.ROUND_PAUSED, handleRoundPaused);
    socket.on(SOCKET_EVENTS.ROUND_RESUMED, handleRoundResumed);
    socket.on(SOCKET_EVENTS.ROUND_ENDED, handleRoundEnded);
    socket.on(SOCKET_EVENTS.EVENT_RESET, handleEventReset);
    socket.on(SOCKET_EVENTS.EVENT_ENDED, handleEventEnded);
    socket.on('round:stage_changed', handleStageChanged);
    socket.on('leaderboard:toggle', handleLeaderboardToggle);
    socket.on('settings:updated', handleSettingsUpdated);
    socket.on('connect', syncState);

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
      socket.off(SOCKET_EVENTS.ROUND_PAUSED, handleRoundPaused);
      socket.off(SOCKET_EVENTS.ROUND_RESUMED, handleRoundResumed);
      socket.off(SOCKET_EVENTS.ROUND_ENDED, handleRoundEnded);
      socket.off(SOCKET_EVENTS.EVENT_RESET, handleEventReset);
      socket.off(SOCKET_EVENTS.EVENT_ENDED, handleEventEnded);
      socket.off('round:stage_changed', handleStageChanged);
      socket.off('leaderboard:toggle', handleLeaderboardToggle);
      socket.off('settings:updated', handleSettingsUpdated);
      socket.off('connect', syncState);
    };
  }, [socket, syncState]);

  return (
    <EventStateContext.Provider value={{
      currentRound, eventStatus, showLeaderboard, activeStage,
      setCurrentRound, setEventStatus, setShowLeaderboard, setActiveStage, syncState
    }}>
      {children}
    </EventStateContext.Provider>
  );
};
