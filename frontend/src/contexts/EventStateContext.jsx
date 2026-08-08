import React, { createContext, useState, useEffect, useContext } from 'react';
import { SocketContext } from './SocketContext';
import { SOCKET_EVENTS } from '../utils/constants';

export const EventStateContext = createContext(null);

export const EventStateProvider = ({ children }) => {
  const socket = useContext(SocketContext);
  const [currentRound, setCurrentRound] = useState(null);
  const [eventStatus, setEventStatus] = useState('idle'); // idle, running, paused, ended

  useEffect(() => {
    if (!socket) return;

    const handleRoundChanged = (data) => {
      setCurrentRound(data.roundData);
      setEventStatus('running');
    };

    const handleRoundPaused = () => setEventStatus('paused');
    const handleRoundResumed = () => setEventStatus('running');
    const handleRoundEnded = () => setEventStatus('idle'); // or transition to leaderboard
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

    return () => {
      socket.off(SOCKET_EVENTS.ROUND_CHANGED, handleRoundChanged);
      socket.off(SOCKET_EVENTS.ROUND_PAUSED, handleRoundPaused);
      socket.off(SOCKET_EVENTS.ROUND_RESUMED, handleRoundResumed);
      socket.off(SOCKET_EVENTS.ROUND_ENDED, handleRoundEnded);
      socket.off(SOCKET_EVENTS.EVENT_RESET, handleEventReset);
      socket.off(SOCKET_EVENTS.EVENT_ENDED, handleEventEnded);
    };
  }, [socket]);

  return (
    <EventStateContext.Provider value={{ currentRound, eventStatus, setCurrentRound, setEventStatus }}>
      {children}
    </EventStateContext.Provider>
  );
};
