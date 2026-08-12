import React, { useState, useEffect, useCallback } from 'react';
import { getRounds } from '../../api/roundApi';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions } from '../../api/questionApi';
import { HelpCircle, Plus, Edit, Trash2, X, ChevronDown, ChevronUp, Image } from 'lucide-react';

function normalizeOptions(options, type) {
  if (!options) return type === 'guess-author' ? [{ text: '', author: 'Human' }, { text: '', author: 'Gemini' }] : ['', '', '', ''];
  let arr = options;
  if (typeof options === 'string') {
    try { arr = JSON.parse(options); } catch { arr = []; }
  }
  if (!Array.isArray(arr)) return type === 'guess-author' ? [{ text: '', author: 'Human' }, { text: '', author: 'Gemini' }] : ['', '', '', ''];
  
  if (type === 'guess-author') {
     const human = arr.find(o => o?.author === 'Human') || { text: '', author: 'Human' };
     const gemini = arr.find(o => o?.author === 'Gemini') || { text: '', author: 'Gemini' };
     human.id = human.id || 'human-opt';
     gemini.id = gemini.id || 'gemini-opt';
     return [human, gemini];
  }
  if (type === 'poll') {
    if (!Array.isArray(arr) || arr.length === 0) {
      return [
        { key: 'A', question: '', answer: '' },
        { key: 'B', question: '', answer: '' },
        { key: 'C', question: '', answer: '' }
      ];
    }
    return arr.map((o, i) => {
      const key = String.fromCharCode(65 + i);
      if (typeof o === 'object' && o !== null) {
        return {
          key: o.key || key,
          question: o.question || o.text || '',
          answer: o.answer || o.text || ''
        };
      }
      return { key, question: String(o || ''), answer: String(o || '') };
    });
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
    } else if (form.type === 'poll') {
       validOptions = form.options.filter(o => o.question.trim());
       if (validOptions.length === 0) { setError('At least one poll option is required'); return; }
    } else if (form.type === 'mcq') {
       validOptions = form.options.map(getOptText).filter(o => o.trim());
       if (validOptions.length === 0) { setError('At least one option is required for MCQ'); return; }
    }
    
    let answer = form.correctAnswer.trim();
    if (form.type === 'mcq' && (!answer || !validOptions.includes(answer))) {
      answer = validOptions[0] || '';
    } else if (form.type === 'poll') {
      answer = 'Poll Answer'; // Polls don't have a single correct answer
    } else if (form.type === 'guess-author' && !answer) {
      answer = 'Human';
    } else if (form.type === 'profile-guess') {
      answer = 'Profile Guess';
    }
    if (!answer) { setError('Correct answer is required'); return; }
    
    setSaving(true);
    try {
      const payload = {
        text: form.text,
        type: form.type,
        correctAnswer: answer,
        points: parseInt(form.points) || 10,
        durationSeconds: parseInt(form.durationSeconds) || 60,
        order: parseInt(form.order) || 1,
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
                <option value="profile-guess">Decode Profile (Round 3 Final)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Points</label>
              <input type="number" min="1" max="1000" className="input-field" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value === '' ? '' : parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Time (seconds)</label>
              <input type="number" min="5" max="3600" className="input-field" value={form.durationSeconds} onChange={e => setForm(f => ({ ...f, durationSeconds: e.target.value === '' ? '' : parseInt(e.target.value) }))} />
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
          {form.type === 'mcq' && (
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
          {form.type === 'poll' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm text-slate-400 font-bold">Poll Options & Revealed Answers</label>
                <button
                  type="button"
                  onClick={() => {
                    const nextKey = String.fromCharCode(65 + form.options.length);
                    setForm(f => ({ ...f, options: [...f.options, { key: nextKey, question: '', answer: '' }] }));
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300 font-bold flex items-center space-x-1"
                >
                  <Plus size={14} /><span>Add Option</span>
                </button>
              </div>
              <div className="space-y-3">
                {form.options.map((opt, i) => (
                  <div key={i} className="p-3 border border-dark-600 rounded-lg bg-dark-900/60 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-400">Option {opt.key || String.fromCharCode(65 + i)}</span>
                      {form.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const opts = form.options.filter((_, idx) => idx !== i);
                            setForm(f => ({ ...f, options: opts }));
                          }}
                          className="text-rose-400 hover:text-rose-300 text-xs"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Poll Question / Prompt Text (Option {String.fromCharCode(65 + i)})</label>
                      <input className="input-field py-1 text-xs" value={opt.question} onChange={e => handleOptionChange(i, e.target.value, 'question')} placeholder="e.g. What does a perfect Sunday look like for you?" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Revealed Answer Text (Shown if this option gets max votes)</label>
                      <textarea rows={2} className="input-field py-1 text-xs resize-none" value={opt.answer} onChange={e => handleOptionChange(i, e.target.value, 'answer')} placeholder="e.g. A slow morning, a good lunch, and a quiet evening..." />
                    </div>
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
          {form.type === 'profile-guess' && (
            <div className="space-y-3 p-4 border border-emerald-500/30 rounded-lg bg-emerald-500/10">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Target Profile Answers for Evaluation</h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Age</label>
                  <input type="number" className="input-field py-1 text-sm" value={form.targetAge || '47'} onChange={e => setForm(f => ({ ...f, targetAge: e.target.value }))} placeholder="47" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Profession</label>
                  <input type="text" className="input-field py-1 text-sm" value={form.targetProfession || 'Lawyer'} onChange={e => setForm(f => ({ ...f, targetProfession: e.target.value }))} placeholder="Lawyer" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Hobby</label>
                  <input type="text" className="input-field py-1 text-sm" value={form.targetHobby || 'Photography'} onChange={e => setForm(f => ({ ...f, targetHobby: e.target.value }))} placeholder="Photography" />
                </div>
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
              <input type="number" min="1" className="input-field" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value === '' ? '' : parseInt(e.target.value) }))} />
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

  const handleMoveQuestion = async (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const newQuestions = [...questions];
    const temp = newQuestions[idx];
    newQuestions[idx] = newQuestions[targetIdx];
    newQuestions[targetIdx] = temp;
    setQuestions(newQuestions);
    const newIds = newQuestions.map(q => q.id);
    try {
      await reorderQuestions(selectedRound, newIds);
      showSuccess('Questions reordered successfully');
    } catch {
      setError('Failed to reorder questions');
      fetchQuestions();
    }
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

      {/* Toast Notification (Floating Bottom-Right) */}
      {success && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-emerald-600/90 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-emerald-400/40 text-sm font-medium animate-fade-in">
          <CheckCircle size={18} className="text-emerald-200" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-2 text-white/70 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg text-sm border bg-rose-900/40 border-rose-500/40 text-rose-300 flex items-center justify-between mb-2">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-white"><X size={16} /></button>
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
              <div className="flex items-center space-x-1 flex-shrink-0">
                <div className="flex items-center space-x-1 border-r border-dark-700 pr-1 mr-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveQuestion(idx, 'up')}
                    className="p-1 rounded hover:bg-dark-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move Question Up"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    disabled={idx === questions.length - 1}
                    onClick={() => handleMoveQuestion(idx, 'down')}
                    className="p-1 rounded hover:bg-dark-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Move Question Down"
                  >
                    <ChevronDown size={15} />
                  </button>
                </div>
                <button onClick={() => setModal(q)} className="p-1.5 rounded hover:bg-dark-700 text-slate-400 hover:text-white" title="Edit"><Edit size={15} /></button>
                <button onClick={() => handleDelete(q)} className="p-1.5 rounded hover:bg-rose-900/30 text-rose-400 hover:text-rose-300" title="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
