import React, { useState, useEffect, useCallback } from 'react';
import { getRounds } from '../../api/roundApi';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../../api/questionApi';
import { HelpCircle, Plus, Edit, Trash2, X, ChevronDown, ChevronUp, Image } from 'lucide-react';

function normalizeOptions(options, type) {
  if (!options) return type === 'guess-author' ? [{ text: '', author: 'Human' }, { text: '', author: 'Gemini' }] : ['', '', '', ''];
  let arr = options;
  if (typeof options === 'string') {
    try { arr = JSON.parse(options); } catch { arr = []; }
  }
  if (!Array.isArray(arr)) return type === 'guess-author' ? [{ text: '', author: 'Human' }, { text: '', author: 'Gemini' }] : ['', '', '', ''];
  
  if (type === 'guess-author') {
     const human = arr.find(o => o?.author === 'Human') || { text: '', author: 'Human', id: 'human-opt' };
     const gemini = arr.find(o => o?.author === 'Gemini') || { text: '', author: 'Gemini', id: 'gemini-opt' };
     return [human, gemini];
  }
  return arr.map(o => (typeof o === 'object' && o !== null) ? (o.text || o.answer || o.id || '') : String(o || ''));
}

function getOptText(opt) {
  if (typeof opt === 'string') return opt;
  if (opt && typeof opt === 'object') return opt.text || opt.answer || opt.id || JSON.stringify(opt);
  return String(opt || '');
}

function QuestionModal({ question, roundId, onClose, onSave }) {
  const [form, setForm] = useState({
    text: question?.text || '',
    type: question?.type || 'mcq',
    options: normalizeOptions(question?.options, question?.type || 'mcq'),
    correctAnswer: question?.correctAnswer || '',
    points: question?.points || 10,
    durationSeconds: question?.durationSeconds || 300,
    order: question?.order || 1,
    showEvaluation: question?.showEvaluation !== false,
    imageUrl: question?.imageUrl || '',
    imageWidth: question?.imageProps?.width || '',
    imageHeight: question?.imageProps?.height || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleOptionChange = (idx, value, field = null) => {
    const opts = [...form.options];
    if (field) {
      opts[idx] = { ...opts[idx], [field]: value };
    } else {
      opts[idx] = value;
    }
    setForm(f => ({ ...f, options: opts }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) { setError('Question text is required'); return; }
    
    let validOptions = [];
    if (form.type === 'guess-author') {
       validOptions = form.options.filter(o => o.text.trim());
       if (validOptions.length < 2) { setError('Both Human and Gemini responses are required'); return; }
    } else if (form.type === 'mcq' || form.type === 'poll') {
       validOptions = form.options.map(getOptText).filter(o => o.trim());
       if (validOptions.length === 0) { setError('At least one option is required for this question type'); return; }
    }
    
    let answer = form.correctAnswer.trim();
    if ((form.type === 'mcq' || form.type === 'poll') && (!answer || !validOptions.includes(answer))) {
      answer = validOptions[0] || '';
    } else if (form.type === 'guess-author' && !answer) {
      answer = 'Human'; // Default to Human if not specified, though random is better if handled by backend
    }
    if (!answer) { setError('Correct answer is required'); return; }
    
    setSaving(true);
    try {
      const payload = {
        text: form.text,
        type: form.type,
        correctAnswer: answer,
        points: form.points,
        durationSeconds: form.durationSeconds,
        order: form.order,
        showEvaluation: form.showEvaluation,
        options: validOptions,
      };
      if (form.imageUrl) {
        payload.imageUrl = form.imageUrl;
        payload.imageProps = { width: form.imageWidth, height: form.imageHeight };
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="card w-full max-w-lg relative my-4">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
        <h2 className="text-lg font-bold text-white mb-5">{question ? 'Edit Question' : 'New Question'}</h2>
        {error && <div className="mb-4 bg-rose-900/40 border border-rose-500/40 text-rose-300 p-3 rounded-lg text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Question Text</label>
            <textarea required rows={3} className="input-field resize-none" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Enter your question here..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, options: normalizeOptions(f.options, e.target.value) }))}>
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="short">Short Answer</option>
                <option value="poll">Live Poll</option>
                <option value="guess-author">Guess the Author (Round 1)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Points</label>
              <input type="number" min="1" max="1000" className="input-field" value={form.points} onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value) || 10 }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Time (seconds)</label>
              <input type="number" min="5" max="3600" className="input-field" value={form.durationSeconds} onChange={e => setForm(f => ({ ...f, durationSeconds: parseInt(e.target.value) || 300 }))} />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 sm:col-span-8">
              <label className="block text-sm text-slate-400 mb-1">Image URL (Optional)</label>
              <input type="text" className="input-field" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="/images/my-image.png" />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Width</label>
              <input type="text" className="input-field" value={form.imageWidth} onChange={e => setForm(f => ({ ...f, imageWidth: e.target.value }))} placeholder="e.g. 400px" />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Height</label>
              <input type="text" className="input-field" value={form.imageHeight} onChange={e => setForm(f => ({ ...f, imageHeight: e.target.value }))} placeholder="e.g. auto" />
            </div>
          </div>
          {(form.type === 'mcq' || form.type === 'poll') && (
            <div>
              <label className="block text-sm text-slate-400 mb-2">Options</label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-500 bg-dark-700 rounded">{String.fromCharCode(65 + i)}</span>
                    <input className="input-field py-2 text-sm flex-1" value={opt} onChange={e => handleOptionChange(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {form.type === 'guess-author' && (
            <div className="space-y-4">
              <label className="block text-sm text-slate-400 mb-2">Responses to display</label>
              <div className="p-3 border border-blue-500/30 rounded-lg bg-blue-500/10">
                <label className="block text-xs font-bold text-blue-400 mb-1">Human's Response</label>
                <textarea rows={3} className="input-field resize-none text-sm" value={form.options.find(o => o.author === 'Human')?.text || ''} onChange={e => handleOptionChange(form.options.findIndex(o => o.author === 'Human'), e.target.value, 'text')} placeholder="Enter what the human wrote..." />
              </div>
              <div className="p-3 border border-purple-500/30 rounded-lg bg-purple-500/10">
                <label className="block text-xs font-bold text-purple-400 mb-1">Gemini's Response</label>
                <textarea rows={3} className="input-field resize-none text-sm" value={form.options.find(o => o.author === 'Gemini')?.text || ''} onChange={e => handleOptionChange(form.options.findIndex(o => o.author === 'Gemini'), e.target.value, 'text')} placeholder="Enter what Gemini wrote..." />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Correct Answer</label>
            {(form.type === 'mcq' || form.type === 'poll') ? (
              <select className="input-field" value={form.correctAnswer} onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))}>
                <option value="">Select correct option</option>
                {form.options.filter(o => typeof o === 'string' && o.trim()).map((opt, i) => (
                  <option key={i} value={opt}>{String.fromCharCode(65 + i)}: {opt}</option>
                ))}
              </select>
            ) : form.type === 'guess-author' ? (
              <select className="input-field" value={form.correctAnswer} onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))}>
                <option value="Human">Human</option>
                <option value="Gemini">Gemini</option>
              </select>
            ) : (
              <input className="input-field" value={form.correctAnswer} onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))} placeholder="Exact correct answer (case-insensitive)" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Display Order</label>
              <input type="number" min="1" className="input-field" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="flex items-center mt-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-800" checked={form.showEvaluation} onChange={e => setForm(f => ({ ...f, showEvaluation: e.target.checked }))} />
                <span className="text-sm text-slate-300">Show evaluation to participants</span>
              </label>
            </div>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-dark-600 text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary">{saving ? 'Saving...' : 'Save Question'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuestionManagement() {
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showSuccess = (m) => { setSuccess(m); setTimeout(() => setSuccess(''), 3000); };

  useEffect(() => {
    getRounds().then(res => {
      const r = res.data.rounds || [];
      setRounds(r);
      if (r.length > 0) setSelectedRound(r[0].id);
    }).catch(() => setError('Failed to load rounds'));
  }, []);

  const fetchQuestions = useCallback(async () => {
    if (!selectedRound) return;
    setLoading(true);
    try {
      const res = await getQuestions(selectedRound);
      setQuestions(res.data.questions || []);
    } catch { setError('Failed to load questions'); }
    finally { setLoading(false); }
  }, [selectedRound]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleSave = async (data) => {
    if (modal === 'create') {
      await createQuestion(selectedRound, data);
      showSuccess('Question created.');
    } else {
      await updateQuestion(selectedRound, modal.id, data);
      showSuccess('Question updated.');
    }
    fetchQuestions();
  };

  const handleDelete = async (q) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await deleteQuestion(selectedRound, q.id);
      showSuccess('Question deleted.');
      fetchQuestions();
    } catch { setError('Delete failed'); }
  };

  return (
    <div className="space-y-6">
      {modal && (
        <QuestionModal
          question={modal === 'create' ? null : modal}
          roundId={selectedRound}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <HelpCircle size={24} className="text-primary-400" />
          <span>Question Management</span>
        </h1>
        <button onClick={() => setModal('create')} disabled={!selectedRound} className="btn-primary flex items-center space-x-2 text-sm disabled:opacity-40">
          <Plus size={16} /><span>New Question</span>
        </button>
      </div>

      {(error || success) && (
        <div className={`p-3 rounded-lg text-sm border ${error ? 'bg-rose-900/40 border-rose-500/40 text-rose-300' : 'bg-primary-900/40 border-primary-500/40 text-primary-300'}`}>
          {error || success}
          <button className="ml-2 opacity-60" onClick={() => { setError(''); setSuccess(''); }}>✕</button>
        </div>
      )}

      {/* Round Selector */}
      <div className="card">
        <label className="block text-sm text-slate-400 mb-2">Select Round</label>
        <select className="input-field" value={selectedRound} onChange={e => setSelectedRound(e.target.value)}>
          {rounds.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
          ))}
        </select>
      </div>

      {/* Questions List */}
      {loading && <div className="text-center py-8 text-slate-500">Loading questions...</div>}

      <div className="space-y-3">
        {!loading && questions.length === 0 && (
          <div className="card text-center py-12 text-slate-500">
            <HelpCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p>No questions in this round. Click "New Question" to add one.</p>
          </div>
        )}
        {questions.map((q, idx) => (
          <div key={q.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-bold text-slate-500">Q{idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${q.type === 'mcq' ? 'bg-blue-500/20 text-blue-400' : q.type === 'guess-author' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {q.type === 'mcq' ? 'MCQ' : q.type === 'guess-author' ? 'Guess Author' : 'Short Answer'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-500/10 text-primary-400">{q.points} pts</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400">{q.durationSeconds || 300}s</span>
                </div>
                <p className="text-white font-medium">{q.text}</p>
                {q.type === 'mcq' && normalizeOptions(q.options).length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {normalizeOptions(q.options, 'mcq').map((opt, i) => (
                      <div key={i} className={`text-xs px-2 py-1 rounded border ${opt === q.correctAnswer ? 'border-primary-500/40 bg-primary-500/10 text-primary-400' : 'border-dark-700 text-slate-500'}`}>
                        <span className="font-bold mr-1">{String.fromCharCode(65 + i)}.</span>{opt}
                        {opt === q.correctAnswer && <span className="ml-1 text-primary-500">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'guess-author' && normalizeOptions(q.options, 'guess-author').length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {normalizeOptions(q.options, 'guess-author').map((opt, i) => (
                      <div key={i} className={`text-xs px-2 py-1.5 rounded border flex space-x-2 ${opt.author === q.correctAnswer ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-dark-700 text-slate-400'}`}>
                        <span className="font-bold uppercase w-14 shrink-0">{opt.author}:</span>
                        <span className="truncate flex-1">{opt.text}</span>
                        {opt.author === q.correctAnswer && <span className="ml-1 font-bold text-emerald-500">✓ Correct</span>}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'short' && (
                  <p className="text-xs text-slate-500 mt-1">Answer: <span className="text-primary-400">{q.correctAnswer}</span></p>
                )}
              </div>
              <div className="flex space-x-1 flex-shrink-0">
                <button onClick={() => setModal(q)} className="p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-white"><Edit size={15} /></button>
                <button onClick={() => handleDelete(q)} className="p-1.5 rounded hover:bg-rose-900/30 text-rose-400 hover:text-rose-300"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
