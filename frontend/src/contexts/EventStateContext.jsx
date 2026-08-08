import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { SocketContext } from './SocketContext';
import { SOCKET_EVENTS } from '../utils/constants';
import { getCurrentRound } from '../api/roundApi';

export const EventStateContext = createContext(null);

export const EventStateProvider = ({ children }) => {
  const socket = useContext(SocketContext);
  const [currentRound, setCurrentRound] = useState(null);
  const [eventStatus, setEventStatus] = useState('idle'); // idle, running, paused, ended

  // Fetch initial round state on mount or socket connection
  const syncState = useCallback(async () => {
    try {
      const res = await getCurrentRound();
      const r = res.data?.round || (res.data?.id ? res.data : null);
      if (r) {
        setCurrentRound(r);
        setEventStatus(r.status === 'active' ? 'running' : r.status === 'paused' ? 'paused' : 'idle');
      } else {
        setCurrentRound(null);
        setEventStatus('idle');
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
    };
    const handleEventReset = () => {
      setCurrentRound(null);
      setEventStatus('idle');
    };
    const handleEventEnded = () => setEventStatus('ended');

    socket.on(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
    socket.on(SOCKET_EVENTS.ROUND_PAUSED, handleRoundPaused);
    socket.on(SOCKET_EVENTS.ROUND_RESUMED, handleRoundResumed);
    socket.on(SOCKET_EVENTS.ROUND_ENDED, handleRoundEnded);
    socket.on(SOCKET_EVENTS.EVENT_RESET, handleEventReset);
    socket.on(SOCKET_EVENTS.EVENT_ENDED, handleEventEnded);
    socket.on('connect', syncState);

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
      socket.off(SOCKET_EVENTS.ROUND_PAUSED, handleRoundPaused);
      socket.off(SOCKET_EVENTS.ROUND_RESUMED, handleRoundResumed);
      socket.off(SOCKET_EVENTS.ROUND_ENDED, handleRoundEnded);
      socket.off(SOCKET_EVENTS.EVENT_RESET, handleEventReset);
      socket.off(SOCKET_EVENTS.EVENT_ENDED, handleEventEnded);
      socket.off('connect', syncState);
    };
  }, [socket, syncState]);

  return (
    <EventStateContext.Provider value={{ currentRound, eventStatus, setCurrentRound, setEventStatus, syncState }}>
      {children}
    </EventStateContext.Provider>
  );
};
