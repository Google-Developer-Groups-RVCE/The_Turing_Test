import React from "react";

export default function ChallengeCard({ challenge, selectedOption, textValue, onSelect, onTextChange }) {
  return (
    <div className="w-full max-w-3xl bg-white/5 border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-md">
      <h2 className="font-['Borghan'] text-3xl md:text-5xl font-bold text-white mb-2 tracking-wide">{challenge.title}</h2>
      <p className="text-sm text-slate-400 mb-7 italic">{challenge.focus}</p>

      {challenge.prompt ? (
        <div className="bg-black/20 p-4 rounded-lg text-slate-200 border border-white/5 italic mb-6">{challenge.prompt}</div>
      ) : null}

      {challenge.images ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {challenge.images.map((image) => (
            <figure className="flex flex-col gap-2" key={image.label}>
              <img src={image.src} alt={image.label} draggable="false" className="rounded-lg object-cover w-full aspect-video border border-white/10" />
              <figcaption className="text-xs text-center text-slate-400">{image.label}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {challenge.image ? (
        <figure className="flex justify-center mb-6">
          <img src={challenge.image} alt={challenge.title} draggable="false" className="rounded-lg max-h-64 object-contain border border-white/10" />
        </figure>
      ) : null}

      {challenge.type === "text" ? (
        <textarea
          className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
          value={textValue || ""}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={challenge.placeholder}
          rows={8}
          aria-label="Your image generation prompt"
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {challenge.options.map((option) => {
            const isSelected = selectedOption === option.key;
            return (
              <button
                type="button"
                key={option.key}
                className={`relative overflow-hidden w-full text-left py-4 px-6 rounded-2xl border-2 transition-all duration-300 shadow-lg ${
                  isSelected 
                    ? "bg-gradient-to-br from-teal-400/35 to-teal-600/45 border-teal-400 shadow-[0_4px_24px_rgba(0,201,177,0.5),inset_0_1px_0_rgba(255,255,255,0.25)]" 
                    : "border-sky-400/40 bg-gradient-to-br from-sky-400/15 to-blue-600/20 text-white hover:translate-x-1 hover:border-sky-400/80 hover:shadow-[0_4px_20px_rgba(91,200,245,0.35)]"
                }`}
                onClick={() => onSelect(option.key)}
                aria-pressed={isSelected}
              >
                <span className={`font-['Cutepunch'] text-lg mr-2 transition-colors ${isSelected ? "text-teal-200" : "text-sky-300"}`}>{option.key}.</span>
                <span className="text-sm text-slate-400 mb-1 italic">{option.label}</span>
                <div className="text-base text-slate-200 leading-relaxed">{option.answer}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
