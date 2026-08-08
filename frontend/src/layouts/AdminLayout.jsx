import React from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../utils/constants';
import { 
  LayoutDashboard, Users, Layers, HelpCircle, 
  Activity, Trophy, Settings, FileText, LogOut 
} from 'lucide-react';

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== ROLES.ADMIN) return <Navigate to="/participant" replace />;

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/rounds', icon: Layers, label: 'Rounds' },
    { to: '/admin/questions', icon: HelpCircle, label: 'Questions' },
    { to: '/admin/responses', icon: Activity, label: 'Live Responses' },
    { to: '/admin/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
    { to: '/admin/logs', icon: FileText, label: 'Logs' },
  ];

  return (
    <div className="min-h-screen bg-dark-900 flex text-slate-300">
      <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="p-6 border-b border-dark-700">
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin<span className="text-primary-500">Panel</span></h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => 
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-900/50 text-primary-400 border border-primary-500/20' 
                    : 'hover:bg-dark-700 text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-dark-700">
          <div className="mb-4 px-2">
            <div className="text-sm font-medium text-white">{user.name || user.username}</div>
            <div className="text-xs text-slate-500">Administrator</div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center space-x-2 w-full px-4 py-2 text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar h-screen">
        <header className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700 p-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Turing Test Command Center</h2>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
              <span>System Online</span>
            </div>
          </div>
        </header>
        <div className="p-6 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
