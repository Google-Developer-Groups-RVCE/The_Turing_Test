import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AuthLayout from '../layouts/AuthLayout';
import ParticipantLayout from '../layouts/ParticipantLayout';
import SimulationLayout from '../layouts/SimulationLayout';
import AdminLayout from '../layouts/AdminLayout';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

// Participant Pages
import WaitingScreen from '../pages/participant/WaitingScreen';
import RoundPage from '../pages/participant/RoundPage';
import LeaderboardPage from '../pages/participant/LeaderboardPage';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagement from '../pages/admin/UserManagement';
import RoundManagement from '../pages/admin/RoundManagement';
import QuestionManagement from '../pages/admin/QuestionManagement';
import LiveResponses from '../pages/admin/LiveResponses';
import RoundStats from '../pages/admin/RoundStats';
import AdminLeaderboard from '../pages/admin/AdminLeaderboard';
import SettingsPage from '../pages/admin/SettingsPage';
import LogsPage from '../pages/admin/LogsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Participant Routes */}
      <Route path="/participant" element={<ParticipantLayout />}>
        <Route index element={<WaitingScreen />} />
        <Route path="round" element={<RoundPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
      </Route>

      {/* Simulation Routes */}
      <Route path="/simulation" element={<SimulationLayout />}>
        <Route index element={<WaitingScreen />} />
        <Route path="round" element={<RoundPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="rounds" element={<RoundManagement />} />
        <Route path="questions" element={<QuestionManagement />} />
        <Route path="responses" element={<LiveResponses />} />
        <Route path="stats" element={<RoundStats />} />
        <Route path="leaderboard" element={<AdminLeaderboard />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="logs" element={<LogsPage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
