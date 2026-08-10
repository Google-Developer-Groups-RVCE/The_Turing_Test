import React from "react";
import OptionButton from "./OptionButton.jsx";

export default function PollCard({ poll, selectedOption, onSelect, pollResult }) {
  return (
    <div className="w-full max-w-3xl bg-white/5 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-md">
      <h2 className="font-['Borghan'] text-3xl md:text-5xl font-bold text-white mb-2 tracking-wide">{poll.title}</h2>
      <p className="text-sm text-slate-400 mb-7 italic">Focus: {poll.focus}</p>
      <div className="flex flex-col gap-3.5">
        {poll.options.map((opt) => {
          const isWinner = pollResult && String(pollResult.winningKey).toUpperCase() === String(opt.key).toUpperCase();
          return (
            <OptionButton
              key={opt.key}
              optionKey={opt.key}
              question={opt.question}
              answer={opt.answer}
              selected={selectedOption === opt.key}
              onSelect={onSelect}
              isRevealed={!!pollResult}
              isWinner={isWinner}
            />
          );
        })}
      </div>

      {pollResult && (
        <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-purple-900/40 via-dark-900 to-purple-950/40 border-2 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="p-1 bg-purple-500/20 rounded-full">★</span>
            <span>Most Voted Question by Participants (Option {pollResult.winningKey})</span>
          </div>
          <h4 className="text-white text-base font-bold mb-3 italic">
            "{pollResult.winningQuestionText || poll.options.find(o => o.key === pollResult.winningKey)?.question}"
          </h4>
          <div className="p-4 rounded-xl bg-dark-950/80 border border-purple-500/30 text-emerald-300 text-base leading-relaxed font-medium">
            <span className="text-xs font-bold text-slate-400 block uppercase mb-1">Gemini's Response Revealed:</span>
            "{pollResult.answerText}"
          </div>
        </div>
      )}
    </div>
  );
}
