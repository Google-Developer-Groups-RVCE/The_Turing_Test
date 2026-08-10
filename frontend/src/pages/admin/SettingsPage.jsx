import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../api/settingsApi';
import { Settings, Save, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    autoAdvance: false,
    roundDurationSeconds: 300,
    allowLateSubmission: false,
    eventName: 'The Turing Test',
    maxParticipants: 500,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings()
      .then(res => setSettings(s => ({ ...s, ...res.data.settings })))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateSettings(settings);
      setSuccess('Settings saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleBool = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
        <Settings size={24} className="text-primary-400" />
        <span>Event Settings</span>
      </h1>

      {(error || success) && (
        <div className={`p-3 rounded-lg text-sm border ${error ? 'bg-rose-900/40 border-rose-500/40 text-rose-300' : 'bg-primary-900/40 border-primary-500/40 text-primary-300'}`}>
          {error || success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">General</h2>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Event Name</label>
            <input
              className="input-field"
              value={settings.eventName || ''}
              onChange={e => setSettings(s => ({ ...s, eventName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Max Participants</label>
            <input
              type="number"
              min="1"
              max="10000"
              className="input-field"
              value={settings.maxParticipants || 500}
              onChange={e => setSettings(s => ({ ...s, maxParticipants: parseInt(e.target.value) || 500 }))}
            />
          </div>
        </div>

        {/* Round Settings */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Round Settings</h2>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Default Round Duration (seconds)</label>
            <input
              type="number"
              min="30"
              max="3600"
              className="input-field"
              value={settings.roundDurationSeconds ?? 60}
              onChange={e => setSettings(s => ({ ...s, roundDurationSeconds: e.target.value === '' ? '' : parseInt(e.target.value) }))}
            />
            <p className="text-xs text-slate-600 mt-1">
              {Math.floor(((parseInt(settings.roundDurationSeconds) || 60)) / 60)} minutes {((parseInt(settings.roundDurationSeconds) || 60)) % 60} seconds
            </p>
          </div>

          {/* Toggle: Auto Advance */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700">
            <div>
              <div className="text-white font-medium">Auto Advance Rounds</div>
              <div className="text-xs text-slate-500">Automatically move to the next round when timer ends</div>
            </div>
            <button
              type="button"
              onClick={() => toggleBool('autoAdvance')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.autoAdvance ? 'bg-primary-600' : 'bg-dark-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.autoAdvance ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Toggle: Late Submission */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700">
            <div>
              <div className="text-white font-medium">Allow Late Submission</div>
              <div className="text-xs text-slate-500">Accept answers after the round timer expires</div>
            </div>
            <button
              type="button"
              onClick={() => toggleBool('allowLateSubmission')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.allowLateSubmission ? 'bg-primary-600' : 'bg-dark-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.allowLateSubmission ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2">
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
}
