import React from "react";

export default function OptionButton({
  optionKey,
  question,
  answer,
  selected,
  onSelect,
}) {
  return (
    <button
      type="button"
      id={`option-${optionKey.toLowerCase()}`}
      onClick={() => onSelect(optionKey)}
      aria-pressed={selected}
      className={`option-btn${selected ? " selected" : ""}`}
    >
      <div className="option-question">
        {question}
      </div>

      <div className="option-answer">
        {answer}
      </div>
    </button>
  );
}