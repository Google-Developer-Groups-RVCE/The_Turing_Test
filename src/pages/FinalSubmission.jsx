import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
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

    if (
      !predictedAge ||
      !predictedProfession.trim() ||
      !predictedHobby.trim()
    ) {
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
        predictedHobby: predictedHobby.trim(),
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
      <TopNav />

      <main className="final-submission-screen">
        <div className="final-submission-card">

          <div className="final-submission-heading">
            <h1>Final Submission</h1>

            <p>
              Submit your team's guess for the hidden profile.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="final-submission-form"
          >

            {/* AGE */}
            <div className="final-field">
              <label htmlFor="predictedAge">
                Predicted Age
              </label>

              <input
                id="predictedAge"
                type="number"
                min="1"
                max="120"
                value={predictedAge}
                onChange={(e) => setPredictedAge(e.target.value)}
                placeholder="e.g. 35"
              />
            </div>

            {/* PROFESSION */}
            <div className="final-field">
              <label htmlFor="predictedProfession">
                Predicted Profession
              </label>

              <input
                id="predictedProfession"
                type="text"
                value={predictedProfession}
                onChange={(e) =>
                  setPredictedProfession(e.target.value)
                }
                placeholder="e.g. Doctor"
              />
            </div>

            {/* HOBBY */}
            <div className="final-field">
              <label htmlFor="predictedHobby">
                Predicted Hobby
              </label>

              <input
                id="predictedHobby"
                type="text"
                value={predictedHobby}
                onChange={(e) =>
                  setPredictedHobby(e.target.value)
                }
                placeholder="e.g. Photography"
              />
            </div>

            {/* ERROR */}
            {error && (
              <p className="final-error" role="alert">
                {error}
              </p>
            )}

            {/* BUTTON */}
            <div className="final-submit-wrapper">
              <button
                id="final-submit-btn"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Final Guess"}
              </button>
            </div>

          </form>

          {submitting && (
            <div className="final-loader">
              <Loader />
            </div>
          )}

        </div>
      </main>
    </>
  );
}