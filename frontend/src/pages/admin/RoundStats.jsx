import React, { useState, useEffect } from 'react';
import { getRounds } from '../../api/roundApi';
import { getQuestions } from '../../api/questionApi';
import { getResponses } from '../../api/responseApi';
import { BarChart2, Layers, HelpCircle, Users, Activity } from 'lucide-react';
import socket, { SOCKET_EVENTS } from '../../socket';

export default function RoundStats() {
  const [rounds, setRounds] = useState([]);
  const [selectedRound, setSelectedRound] = useState('');
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRounds();
  }, []);

  useEffect(() => {
    if (selectedRound) {
      fetchRoundData(selectedRound);
    }
  }, [selectedRound]);

  useEffect(() => {
    if (!socket) return;
    const handleNewResponse = () => {
      if (selectedRound) {
        // Silent re-fetch so it doesn't show loading spinner constantly
        Promise.all([
          getQuestions(selectedRound),
          getResponses(selectedRound)
        ]).then(([qRes, rRes]) => {
          setQuestions(qRes.data?.questions || []);
          const resps = Array.isArray(rRes.data) ? rRes.data : rRes.data?.responses || [];
          setResponses(resps);
        }).catch(console.error);
      }
    };

    socket.on(SOCKET_EVENTS.RESPONSE_RECEIVED, handleNewResponse);
    return () => {
      socket.off(SOCKET_EVENTS.RESPONSE_RECEIVED, handleNewResponse);
    };
  }, [selectedRound]);

  const fetchRounds = async () => {
    setLoading(true);
    try {
      const res = await getRounds();
      const list = res.data?.rounds || [];
      setRounds(list);
      if (list.length > 0) {
        setSelectedRound(list[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoundData = async (roundId) => {
    setLoading(true);
    try {
      const [qRes, rRes] = await Promise.all([
        getQuestions(roundId),
        getResponses(roundId)
      ]);
      setQuestions(qRes.data?.questions || []);
      
      // If getResponses returns total/responses object:
      const resps = Array.isArray(rRes.data) ? rRes.data : rRes.data?.responses || [];
      setResponses(resps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatsForQuestion = (qId) => {
    const qResponses = responses.filter(r => r.questionId === qId);
    const total = qResponses.length;
    const counts = {};

    qResponses.forEach(r => {
      const ans = (r.answer || 'No Answer').toUpperCase();
      counts[ans] = (counts[ans] || 0) + 1;
    });

    const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { total, sortedCounts };
  };

  if (loading && rounds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-slate-400">
        <Activity className="animate-pulse mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
          <BarChart2 size={24} className="text-primary-400" />
          <span>Round Statistics</span>
        </h1>
        
        <div className="flex items-center space-x-3 bg-dark-800 p-2 rounded-xl border border-dark-700">
          <Layers size={18} className="text-slate-400" />
          <select 
            className="bg-dark-900 border border-dark-600 text-white rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500"
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
          >
            {rounds.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading data...</div>
      ) : questions.length === 0 ? (
        <div className="text-center py-10 text-slate-400 bg-dark-800 rounded-xl border border-dark-700">
          No questions found for this round.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {questions.map((q, idx) => {
            const { total, sortedCounts } = getStatsForQuestion(q.id);
            return (
              <div key={q.id} className="bg-dark-800 border border-dark-700 rounded-xl p-5 shadow-lg flex flex-col">
                <div className="flex justify-between items-start mb-4 border-b border-dark-700 pb-3">
                  <div>
                    <span className="text-xs font-bold text-primary-400 uppercase tracking-wider mb-1 block">
                      Question {idx + 1}
                    </span>
                    <h3 className="text-slate-200 font-medium line-clamp-2">
                      {q.text || q.prompt || 'Untitled Question'}
                    </h3>
                  </div>
                  <div className="bg-dark-900 border border-dark-600 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shrink-0 ml-3">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-sm font-bold text-white">{total}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {total === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-slate-500 text-sm">
                      <Activity size={24} className="mb-2 opacity-50" />
                      No responses yet
                    </div>
                  ) : (
                    sortedCounts.map(([option, count], i) => {
                      const percentage = Math.round((count / total) * 100);
                      // Different colors for options for visual distinction
                      const barColor = i === 0 ? 'bg-primary-500' : i === 1 ? 'bg-emerald-500' : i === 2 ? 'bg-amber-500' : 'bg-slate-500';
                      
                      return (
                        <div key={option} className="space-y-1.5">
                          <div className="flex justify-between items-end text-sm">
                            <span className="font-bold text-slate-300 truncate pr-2 max-w-[70%]" title={option}>
                              {option}
                            </span>
                            <span className="text-slate-400 font-mono">
                              {count} <span className="text-xs opacity-70">({percentage}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-dark-900 rounded-full h-2.5 border border-dark-700 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
