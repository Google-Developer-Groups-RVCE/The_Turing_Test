import React, { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import pollsData from "../data/pollsData.js";
import { useSession } from "../context/SessionContext.jsx";
import { submitPollAnswer } from "../api/responseService.js";
import PollCard from "../components/PollCard.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import Loader from "../components/Loader.jsx";
import { TopNav } from "./TeamEntry.jsx";

export default function Poll() {
  const { pollNumber } = useParams();
  const navigate = useNavigate();

  const { teamId, answers, setAnswer } = useSession();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const index = Number(pollNumber) - 1;
  const poll = pollsData[index];

  // If there is no active team, go back to team entry
  if (!teamId) {
    return <Navigate to="/" replace />;
  }

  // If the poll number is invalid, go back to the first poll
  if (!poll) {
    return <Navigate to="/poll/1" replace />;
  }

  const selectedOption = answers[poll.id];

  const isLast =
    Number(pollNumber) === pollsData.length;

  const handleSelect = (optionKey) => {
    setAnswer(poll.id, optionKey);
    setError("");
  };

  const handleNext = async () => {
    if (!selectedOption) {
      setError("Please select an option before continuing.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await submitPollAnswer({
        teamId,
        pollId: poll.id,
        optionKey: selectedOption,
      });

      const nextNumber = Number(pollNumber) + 1;

      if (nextNumber > pollsData.length) {
        navigate("/final-submission");
      } else {
        navigate(`/poll/${nextNumber}`);
      }
    } catch (err) {
      setError("Could not submit your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TopNav />

      <main className="poll-screen">

        {/* Progress */}
        <ProgressBar
          current={Number(pollNumber)}
          total={pollsData.length}
        />

        {/* Poll */}
        <PollCard
          poll={poll}
          selectedOption={selectedOption}
          onSelect={handleSelect}
        />

        {/* Actions */}
        <div className="poll-actions">

          {error ? (
            <p
              role="alert"
              className="poll-error"
            >
              {error}
            </p>
          ) : null}

          <button
            id={`next-btn-poll-${pollNumber}`}
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className={`btn-glossy${isLast ? " final" : ""}`}
          >
            {isLast
              ? "Continue to Final Submission"
              : "Next →"}
          </button>

          {submitting ? <Loader /> : null}

        </div>

      </main>
    </>
  );
}