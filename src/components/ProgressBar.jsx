import React from "react";

export default function ProgressBar({ current, total }) {
  return (
    <p>
      Step {current} of {total}
    </p>
  );
}
