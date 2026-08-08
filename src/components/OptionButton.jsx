import React from "react";

/**
 * Glossy light-blue option button.
 * Turns teal when selected — no "selected" label shown.
 */
export default function OptionButton({ optionKey, question, answer, selected, onSelect }) {
  return (
    <button
      type="button"
      id={`option-${optionKey.toLowerCase()}`}
      onClick={() => onSelect(optionKey)}
      aria-pressed={selected}
      className={`option-btn${selected ? " selected" : ""}`}
    >
      <div style={{ marginBottom: "4px" }}>
        <span className="option-key">{optionKey}.</span>
        <span className="option-question">{question}</span>
      </div>
    </button>
  );
}
