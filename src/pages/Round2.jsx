import React from "react";
import ChallengeRound from "./ChallengeRound.jsx";
import round2Data from "../data/round2Data.js";

export default function Round2() {
  return <ChallengeRound data={round2Data} roundNumber={2} nextPath="/poll/1" />;
}
