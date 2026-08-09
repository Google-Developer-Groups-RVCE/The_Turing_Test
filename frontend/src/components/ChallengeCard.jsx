import React from "react";

export default function ChallengeCard({ challenge, selectedOption, textValue, onSelect, onTextChange }) {
  return (
    <div className="challenge-card">
      <h2 className="poll-title">{challenge.title}</h2>
      <p className="poll-focus">{challenge.focus}</p>

      {challenge.prompt ? (
        <div className="challenge-prompt">{challenge.prompt}</div>
      ) : null}

      {challenge.images ? (
        <div className="challenge-image-grid">
          {challenge.images.map((image) => (
            <figure className="challenge-image-item" key={image.label}>
              <img src={image.src} alt={image.label} draggable="false" />
              <figcaption>{image.label}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {challenge.image ? (
        <figure className="challenge-single-image">
          <img src={challenge.image} alt={challenge.title} draggable="false" />
        </figure>
      ) : null}

      {challenge.type === "text" ? (
        <textarea
          className="challenge-textarea"
          value={textValue || ""}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={challenge.placeholder}
          rows={8}
          aria-label="Your image generation prompt"
        />
      ) : (
        <div className="options-list">
          {challenge.options.map((option) => (
            <button
              type="button"
              key={option.key}
              className={`option-btn${selectedOption === option.key ? " selected" : ""}`}
              onClick={() => onSelect(option.key)}
              aria-pressed={selectedOption === option.key}
            >
              <span className="option-key">{option.key}.</span>
              <span className="option-question">{option.label}</span>
              <div className="option-answer">{option.answer}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
