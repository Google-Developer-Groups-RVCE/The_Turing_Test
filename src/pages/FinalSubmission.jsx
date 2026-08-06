import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { submitFinalGuess } from "../api/responseService.js";
import Loader from "../components/Loader.jsx";

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
    <div>
      <h1>Final Submission</h1>
      <p>Submit your team's guess for the hidden profile.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="predictedAge">Predicted Age</label>
        <br />
        <input
          id="predictedAge"
          type="number"
          min="1"
          max="120"
          value={predictedAge}
          onChange={(e) => setPredictedAge(e.target.value)}
        />
        <br />
        <label htmlFor="predictedProfession">Predicted Profession</label>
        <br />
        <input
          id="predictedProfession"
          type="text"
          value={predictedProfession}
          onChange={(e) => setPredictedProfession(e.target.value)}
        />
        <br />
        <label htmlFor="predictedHobby">Predicted Hobby</label>
        <br />
        <input
          id="predictedHobby"
          type="text"
          value={predictedHobby}
          onChange={(e) => setPredictedHobby(e.target.value)}
        />
        <br />
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={submitting}>
          Submit Final Guess
        </button>
      </form>
      {submitting ? <Loader /> : null}
    </div>
  );
}
