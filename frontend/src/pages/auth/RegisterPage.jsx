import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Brain, User, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', password: '', name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim()) {
      setError('Username is required');
      return;
    }
    if (form.password.length < 1) {
      setError('Password is required');
      return;
    }
    setIsLoading(true);
    try {
      const user = await register(form.username.trim(), form.password, form.name);
      if (user && user.role === 'admin') navigate('/admin');
      else navigate('/participant');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center mb-8">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-600 to-emerald-500 shadow-lg shadow-primary-500/30 mr-3">
          <Brain size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">The Turing Test</h1>
          <p className="text-xs text-slate-400">GDG RVCE Induction Program</p>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2 text-center">Create Account</h2>
      <p className="text-sm text-slate-400 text-center mb-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Sign In
        </Link>
      </p>

      {error && (
        <div className="bg-rose-900/40 border border-rose-500/40 text-rose-300 p-3 rounded-lg mb-4 text-sm flex items-start space-x-2">
          <span>⚠</span><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              name="name"
              required
              className="input-field pl-9"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">
            Username
          </label>
          <div className="relative">
            <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              name="username"
              required
              className="input-field pl-9"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose a username"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              className="input-field pl-9 pr-10"
              value={form.password}
              onChange={handleChange}
              placeholder="Choose a strong password"
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
              <span>Creating Account...</span>
            </span>
          ) : 'Register'}
        </button>
      </form>
    </div>
  );
}
