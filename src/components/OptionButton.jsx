import React from "react";

/**
 * Plain, unstyled option button. No design system on purpose —
 * this is a baseline capture UI only.
 */
export default function OptionButton({ optionKey, question, answer, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(optionKey)}
      aria-pressed={selected}
      style={{ width: "100%", textAlign: "left", display: "block", marginBottom: "8px" }}
    >
      <div>
        <strong>{optionKey}.</strong> {question}
      </div>
      <div>{answer}</div>
      {selected ? <div>(selected)</div> : null}
    </button>
  );
}
