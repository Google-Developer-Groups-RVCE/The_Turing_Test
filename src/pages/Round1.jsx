import React from "react";
import ChallengeRound from "./ChallengeRound.jsx";
import round1Data from "../data/round1Data.js";

export default function Round1() {
  return <ChallengeRound data={round1Data} roundNumber={1} nextPath="/round2/1" />;
}
