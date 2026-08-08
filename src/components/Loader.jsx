import React from "react";

export default function Loader({ label = "Loading..." }) {
  return (
    <div className="loader" role="status" aria-label={label}>
      <div className="loader-dot" />
      <div className="loader-dot" />
      <div className="loader-dot" />
      <span style={{ marginLeft: "4px" }}>{label}</span>
    </div>
  );
}
