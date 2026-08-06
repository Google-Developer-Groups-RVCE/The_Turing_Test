import React from "react";
import OptionButton from "./OptionButton.jsx";

export default function PollCard({ poll, selectedOption, onSelect }) {
  return (
    <div>
      <h2>{poll.title}</h2>
      <p>Focus: {poll.focus}</p>
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
  );
}
