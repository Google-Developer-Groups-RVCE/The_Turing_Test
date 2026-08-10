import React from "react";
import OptionButton from "./OptionButton.jsx";

export default function PollCard({ poll, selectedOption, onSelect, pollResult }) {
  return (
    <div className="w-full max-w-3xl bg-white/5 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-md">
      <h2 className="font-['Borghan'] text-3xl md:text-5xl font-bold text-white mb-2 tracking-wide">{poll.title}</h2>
      <p className="text-sm text-slate-400 mb-7 italic">Focus: {poll.focus}</p>
      <div className="flex flex-col gap-3.5">
        {poll.options.map((opt) => (
          <OptionButton
            key={opt.key}
            optionKey={opt.key}
            question={opt.question}
            answer={opt.answer}
            selected={selectedOption === opt.key}
            onSelect={onSelect}
            isRevealed={!!pollResult}
          />
        ))}
      </div>
    </div>
  );
}
