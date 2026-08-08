import React, { useState, useEffect, useCallback } from 'react';
import {
  getUsers, updateUser, deleteUser, uploadCSV, exportCSV,
  bulkDeleteUsers, bulkBlockUsers, bulkUnblockUsers, bulkResetPasswords
} from '../../api/userApi';
import {
  Users, Search, Upload, Download, Trash2, Lock, Unlock,
  Edit, RefreshCw, X, Check, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    password: '',
    role: user?.role || 'participant',
    status: user?.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name, role: form.role, status: form.status };
      if (form.password) payload.password = form.password;
      await onSave(user.username, payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
        <h2 className="text-lg font-bold text-white mb-1">Edit User</h2>
        <p className="text-sm text-slate-400 mb-5 font-mono">{user.username}</p>
        {error && <div className="mb-4 bg-rose-900/40 border border-rose-500/40 text-rose-300 p-3 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">New Password <span className="text-slate-600">(leave blank to keep current)</span></label>
            <input type="password" className="input-field" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Role</label>
              <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="participant">Participant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [csvResult, setCsvResult] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUsers({ page, limit: pageSize, search, role: filterRole, status: filterStatus });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterRole, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleSaveUser = async (username, data) => {
    await updateUser(username, data);
    showSuccess(`User ${username} updated.`);
    fetchUsers();
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Delete user ${username}? This is irreversible.`)) return;
    try {
      await deleteUser(username);
      showSuccess(`User ${username} deleted.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleBlock = async (username, block) => {
    try {
      await updateUser(username, { status: block ? 'blocked' : 'active' });
      showSuccess(`User ${username} ${block ? 'blocked' : 'unblocked'}.`);
      fetchUsers();
    } catch { setError('Action failed'); }
  };

  const handleBulk = async (action) => {
    if (selected.size === 0) return;
    const usernames = [...selected];
    if (action === 'delete' && !window.confirm(`Delete ${usernames.length} users?`)) return;
    try {
      if (action === 'delete') await bulkDeleteUsers(usernames);
      else if (action === 'block') await bulkBlockUsers(usernames);
      else if (action === 'unblock') await bulkUnblockUsers(usernames);
      else if (action === 'reset') await bulkResetPasswords(usernames);
      showSuccess(`Bulk ${action} applied to ${usernames.length} users.`);
      setSelected(new Set());
      fetchUsers();
    } catch { setError(`Bulk ${action} failed`); }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await uploadCSV(fd);
      setCsvResult(res.data);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'CSV upload failed');
    }
    e.target.value = '';
  };

  const handleExport = async () => {
    try {
      const res = await exportCSV();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'users.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Export failed'); }
  };

  const toggleSelect = (username) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(username) ? next.delete(username) : next.add(username);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map((u) => u.username)));
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {editUser && (
        <UserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSaveUser}
        />
      )}

      {csvResult && (
        <div className="card border-primary-500/30">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-white mb-2">CSV Import Result</h3>
              <div className="flex space-x-4 text-sm">
                <span className="text-primary-400">✓ {csvResult.success} imported</span>
                <span className="text-rose-400">✗ {csvResult.failed} failed</span>
                <span className="text-yellow-400">⟳ {csvResult.duplicates} skipped</span>
              </div>
              {csvResult.errors?.length > 0 && (
                <ul className="mt-2 text-xs text-slate-500 space-y-0.5">
                  {csvResult.errors.slice(0, 5).map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
                </ul>
              )}
            </div>
            <button onClick={() => setCsvResult(null)}><X size={18} className="text-slate-500 hover:text-white" /></button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Users size={24} className="text-primary-400" />
          <span>User Management</span>
          <span className="text-sm font-normal text-slate-500 ml-2">({total} users)</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <label className="btn-primary flex items-center space-x-2 cursor-pointer px-3 py-2 text-sm">
            <Upload size={16} /><span>Import CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          </label>
          <button onClick={handleExport} className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-dark-600 text-slate-300 hover:text-white transition-colors text-sm">
            <Download size={16} /><span>Export CSV</span>
          </button>
          <button onClick={fetchUsers} className="p-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`p-3 rounded-lg text-sm border ${error ? 'bg-rose-900/40 border-rose-500/40 text-rose-300' : 'bg-primary-900/40 border-primary-500/40 text-primary-300'}`}>
          {error || success}
          <button className="ml-2 opacity-60 hover:opacity-100" onClick={() => { setError(''); setSuccess(''); }}>✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-9 py-2 text-sm"
            placeholder="Search by username or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input-field py-2 text-sm w-36" value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="participant">Participant</option>
          <option value="admin">Admin</option>
        </select>
        <select className="input-field py-2 text-sm w-36" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center space-x-3 p-3 bg-primary-900/20 border border-primary-500/20 rounded-xl">
          <span className="text-sm text-primary-300 font-medium">{selected.size} selected</span>
          <div className="flex space-x-2 ml-auto">
            <button onClick={() => handleBulk('block')} className="px-3 py-1.5 text-xs rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors flex items-center space-x-1"><Lock size={12} /><span>Block</span></button>
            <button onClick={() => handleBulk('unblock')} className="px-3 py-1.5 text-xs rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 transition-colors flex items-center space-x-1"><Unlock size={12} /><span>Unblock</span></button>
            <button onClick={() => handleBulk('reset')} className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center space-x-1"><RefreshCw size={12} /><span>Reset PWD</span></button>
            <button onClick={() => handleBulk('delete')} className="px-3 py-1.5 text-xs rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center space-x-1"><Trash2 size={12} /><span>Delete</span></button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-900/50">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleAll} className="rounded border-dark-600" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {loading && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">Loading users...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">No users found.</td></tr>
              )}
              {!loading && users.map((u) => (
                <tr key={u.username} className={`hover:bg-dark-800/40 transition-colors ${selected.has(u.username) ? 'bg-primary-900/10' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(u.username)} onChange={() => toggleSelect(u.username)} className="rounded border-dark-600" />
                  </td>
                  <td className="px-4 py-3 font-mono text-white text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-slate-300">{u.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-dark-700 text-slate-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.status === 'blocked' ? 'bg-rose-500/20 text-rose-400' : 'bg-primary-500/10 text-primary-400'}`}>
                      {u.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => setEditUser(u)} className="p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-white transition-colors" title="Edit">
                        <Edit size={15} />
                      </button>
                      <button onClick={() => handleBlock(u.username, u.status !== 'blocked')} className={`p-1.5 rounded hover:bg-dark-700 transition-colors ${u.status === 'blocked' ? 'text-primary-400 hover:text-primary-300' : 'text-yellow-400 hover:text-yellow-300'}`} title={u.status === 'blocked' ? 'Unblock' : 'Block'}>
                        {u.status === 'blocked' ? <Unlock size={15} /> : <Lock size={15} />}
                      </button>
                      <button onClick={() => handleDelete(u.username)} className="p-1.5 rounded hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 transition-colors" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700 text-sm">
            <span className="text-slate-500">Page {page} of {totalPages} ({total} users)</span>
            <div className="flex items-center space-x-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border border-dark-600 text-slate-400 disabled:opacity-40 hover:text-white transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border border-dark-600 text-slate-400 disabled:opacity-40 hover:text-white transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
