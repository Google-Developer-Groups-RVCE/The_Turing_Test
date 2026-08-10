import React from "react";
import { Routes, Route } from "react-router-dom";
import TeamEntry from "../pages/TeamEntry.jsx";
import Poll from "../pages/Poll.jsx";
import FinalSubmission from "../pages/FinalSubmission.jsx";
import ThankYou from "../pages/ThankYou.jsx";
import Round1 from "../pages/Round1.jsx";
import Round2 from "../pages/Round2.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TeamEntry />} />
      <Route path="/round1/:questionNumber" element={<Round1 />} />
      <Route path="/round2/:questionNumber" element={<Round2 />} />
      <Route path="/poll/:pollNumber" element={<Poll />} />
      <Route path="/final-submission" element={<FinalSubmission />} />
      <Route path="/thank-you" element={<ThankYou />} />
    </Routes>
  );
}
