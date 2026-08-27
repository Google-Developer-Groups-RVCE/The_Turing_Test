import React from 'react';

export default function HallucinationCard({ question, evaluationData }) {
  // Resolve a raw value (key OR full text) to its full option object
  const resolveOption = (raw) => {
    if (!raw || !question.options) return null;
    return question.options.find(o => {
      const k = String(o.key || '').toLowerCase();
      const t = String(o.text || o.answer || o.label || o.key || '').toLowerCase();
      const r = String(raw).toLowerCase();
      return k === r || t === r;
    }) || null;
  };

  const formatOpt = (raw) => {
    const opt = resolveOption(raw);
    if (opt) {
      const key = opt.key || '';
      const text = opt.text || opt.answer || opt.label || opt.key || '';
      return key ? `${key} — ${text}` : text;
    }
    return raw || '';
  };

  return (
    <section className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-white text-slate-900 shadow-2xl">
      <div className="h-1.5 bg-gradient-to-r from-green-500 via-yellow-400 via-blue-500 to-red-500" />
      <div className="p-6 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{question.title || 'Spot the Hallucination'}</p>
        <h2 className="mt-3 text-2xl font-extrabold leading-snug sm:text-4xl">{question.text}</h2>

        <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-slate-500">AI response</p>
        {question.sourceImageUrl ? (
          <img src={question.sourceImageUrl} alt="AI response to evaluate" className="mt-3 w-full rounded-xl border-2 border-yellow-400" />
        ) : (
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-slate-50 p-5 text-base leading-7 text-slate-700">
            {question.aiResponse}
          </div>
        )}

        <div className="mt-6 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4 text-sm leading-6 text-yellow-950">
          Discuss with your team and make your physical confidence choice before the judges reveal the answer.
        </div>

        {evaluationData && (
          <div className="mt-6 rounded-xl border border-green-200 border-l-4 border-l-green-600 bg-green-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">Answer and explanation</p>
            <h3 className="mt-2 text-xl font-extrabold text-green-950">{formatOpt(evaluationData.correctAnswer)}</h3>
            <p className="mt-2 leading-7 text-green-950">{question.explanation}</p>
          </div>
        )}
      </div>
    </section>
  );
}
