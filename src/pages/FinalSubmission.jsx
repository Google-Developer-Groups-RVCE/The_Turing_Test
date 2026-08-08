import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { submitFinalGuess } from "../api/responseService.js";
import Loader from "../components/Loader.jsx";
import { TopNav } from "./TeamEntry.jsx";

export default function FinalSubmission() {
  const { teamId } = useSession();
  const navigate = useNavigate();
  const [predictedAge, setPredictedAge] = useState("");
  const [predictedProfession, setPredictedProfession] = useState("");
  const [predictedHobby, setPredictedHobby] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!teamId) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!predictedAge || !predictedProfession.trim() || !predictedHobby.trim()) {
      setError("Please fill in all three predictions.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await submitFinalGuess({
        teamId,
        predictedAge: Number(predictedAge),
        predictedProfession: predictedProfession.trim(),
        predictedHobby: predictedHobby.trim()
      });
      navigate("/thank-you");
    } catch (err) {
      setError("Could not submit your final guess. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-bg" aria-hidden="true" />
      <TopNav />
      <div className="page-wrap">
        <div className="final-screen">
          <div className="final-card">
            <h1 className="final-title">Final Submission</h1>
            <p className="final-subtitle">Submit your team's guess for the hidden profile.</p>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="predictedAge" className="final-label">Predicted Age</label>
              <input
                id="predictedAge"
                type="number"
                min="1"
                max="120"
                value={predictedAge}
                onChange={(e) => setPredictedAge(e.target.value)}
                placeholder="e.g. 35"
                className="final-input"
              />

              <label htmlFor="predictedProfession" className="final-label">Predicted Profession</label>
              <input
                id="predictedProfession"
                type="text"
                value={predictedProfession}
                onChange={(e) => setPredictedProfession(e.target.value)}
                placeholder="e.g. Doctor"
                className="final-input"
              />

              <label htmlFor="predictedHobby" className="final-label">Predicted Hobby</label>
              <input
                id="predictedHobby"
                type="text"
                value={predictedHobby}
                onChange={(e) => setPredictedHobby(e.target.value)}
                placeholder="e.g. Photography"
                className="final-input"
              />

              {error ? <p role="alert" className="poll-error" style={{ marginBottom: "16px" }}>{error}</p> : null}

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  id="final-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="btn-glossy final final-guess"
                >
                  {submitting ? "Submitting..." : "Submit Final Guess"}
                </button>
              </div>
            </form>

            {submitting ? <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}><Loader /></div> : null}
          </div>
        </div>
      </div>
    </>
  );
}
