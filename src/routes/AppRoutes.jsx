import React from "react";
import { Routes, Route } from "react-router-dom";
import TeamEntry from "../pages/TeamEntry.jsx";
import Poll from "../pages/Poll.jsx";
import FinalSubmission from "../pages/FinalSubmission.jsx";
import ThankYou from "../pages/ThankYou.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TeamEntry />} />
      <Route path="/poll/:pollNumber" element={<Poll />} />
      <Route path="/final-submission" element={<FinalSubmission />} />
      <Route path="/thank-you" element={<ThankYou />} />
    </Routes>
  );
}
