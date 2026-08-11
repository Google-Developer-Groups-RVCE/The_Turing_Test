import React from "react";

export default function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="progress-wrap">
      <div className="progress-label">
        <span>Poll {current} of {total}</span>
        <span>{pct}%</span>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin="1"
        aria-valuemax={total}
      >
        <div
          className="progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}