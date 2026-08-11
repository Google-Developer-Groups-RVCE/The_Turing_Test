import React from 'react';
import { AuthContext } from '../contexts/AuthContext';
import ParticipantLayout from './ParticipantLayout';

export default function SimulationLayout() {
  const mockUser = {
    username: 'simulated_user',
    name: 'Sample Participant',
    role: 'participant',
  };

  return (
    <AuthContext.Provider value={{ user: mockUser, loading: false, logout: () => {} }}>
      <ParticipantLayout />
    </AuthContext.Provider>
  );
}
