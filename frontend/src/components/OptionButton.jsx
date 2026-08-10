import React from "react";

/**
 * Glossy light-blue option button.
 * Turns teal when selected — no "selected" label shown.
 */
export default function OptionButton({ optionKey, question, answer, selected, onSelect, isRevealed }) {
  return (
    <button
      type="button"
      id={`option-${optionKey.toLowerCase()}`}
      onClick={() => onSelect(optionKey)}
      aria-pressed={selected}
      className={`relative overflow-hidden w-full text-left py-4 px-6 rounded-2xl border-2 transition-all duration-300 shadow-lg ${
        selected 
          ? "bg-gradient-to-br from-teal-400/35 to-teal-600/45 border-teal-400 shadow-[0_4px_24px_rgba(0,201,177,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]" 
          : "border-sky-400/40 bg-gradient-to-br from-sky-400/15 to-blue-600/20 text-white hover:translate-x-1 hover:border-sky-400/80 hover:shadow-[0_4px_20px_rgba(91,200,245,0.35)]"
      }`}
    >
      <div style={{ marginBottom: isRevealed ? "8px" : "4px" }}>
        <span className={`font-['Cutepunch'] text-lg mr-2 transition-colors ${selected ? "text-teal-200" : "text-sky-300"}`}>{optionKey}.</span>
        <span className="text-sm text-slate-400 mb-1 italic">{question}</span>
      </div>
      {isRevealed && (
        <div className="mt-3 p-3 bg-dark-900/50 rounded border border-primary-500/20 text-sm text-slate-300 text-left">
          {answer}
        </div>
      )}
    </button>
  );
}
