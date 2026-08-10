import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/constants';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  // If already authenticated, redirect to appropriate dashboard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === ROLES.ADMIN ? '/admin' : '/participant'} replace />;
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/5 rounded-full blur-2xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle, #22c55e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Auth Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-dark-800/80 backdrop-blur-xl border border-dark-700/80 rounded-2xl p-8 shadow-2xl shadow-black/50">
          <Outlet />
        </div>
        <p className="text-center text-xs text-slate-700 mt-4">
          GDG RVCE · Student Induction Program · 2026
        </p>
      </div>
    </div>
  );
}
