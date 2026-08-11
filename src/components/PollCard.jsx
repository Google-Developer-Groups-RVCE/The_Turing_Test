import React from "react";
import OptionButton from "./OptionButton.jsx";

export default function PollCard({
  poll,
  selectedOption,
  onSelect,
}) {
  return (
    <div className="poll-card">
      <h2 className="poll-title">
        {poll.title}
      </h2>

      <p className="poll-focus">
        Focus: {poll.focus}
      </p>

      <div className="options-list">
        {poll.options.map((opt) => (
          <OptionButton
            key={opt.key}
            optionKey={opt.key}
            question={opt.question}
            answer={opt.answer}
            selected={selectedOption === opt.key}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}