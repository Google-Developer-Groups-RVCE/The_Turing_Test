import React from "react";

export default function Loader({ label = "Submitting..." }) {
  return <p role="status">{label}</p>;
}
