import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Brain, User, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await login(username.trim(), password);
      if (user && user.role === 'admin') navigate('/admin');
      else navigate('/participant');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Brand Header */}
      <div className="flex items-center justify-center mb-8">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-600 to-emerald-500 shadow-lg shadow-primary-500/30 mr-3">
          <Brain size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">The Turing Test</h1>
          <p className="text-xs text-slate-400">GDG RVCE Induction Program</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2 text-center">Welcome Back</h2>
      <p className="text-sm text-slate-400 text-center mb-6">
        New participant?{' '}
        <Link to="/register" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Register here
        </Link>
      </p>

      {error && (
        <div className="bg-rose-900/40 border border-rose-500/40 text-rose-300 p-3 rounded-lg mb-4 text-sm flex items-start space-x-2">
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              required
              autoFocus
              className="input-field pl-9"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g. a or b)"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="input-field pl-9 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full mt-4">
          {isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span>Signing In...</span>
            </span>
          ) : 'Sign In'}
        </button>
      </form>

      {/* Quick hints */}
      <div className="mt-8 pt-4 border-t border-dark-700">
        <p className="text-xs text-slate-600 text-center">
          Admin credentials are pre-configured. Contact your event organizer for help.
        </p>
      </div>
    </div>
  );
}
