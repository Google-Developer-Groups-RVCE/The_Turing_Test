import React, { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import pollsData from "../data/pollsData.js";
import { useSession } from "../context/SessionContext.jsx";
import { submitPollAnswer } from "../api/responseService.js";
import PollCard from "../components/PollCard.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import Loader from "../components/Loader.jsx";

export default function Poll() {
  const { pollNumber } = useParams();
  const navigate = useNavigate();
  const { teamId, answers, setAnswer } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const index = Number(pollNumber) - 1;
  const poll = pollsData[index];

  if (!teamId) {
    return <Navigate to="/" replace />;
  }
  if (!poll) {
    return <Navigate to="/" replace />;
  }

  const selectedOption = answers[poll.id];

  const handleSelect = (optionKey) => {
    setAnswer(poll.id, optionKey);
  };

  const handleNext = async () => {
    if (!selectedOption) {
      setError("Please select an option before continuing.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await submitPollAnswer({ teamId, pollId: poll.id, optionKey: selectedOption });
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
    <div>
      <ProgressBar current={Number(pollNumber)} total={pollsData.length} />
      <PollCard poll={poll} selectedOption={selectedOption} onSelect={handleSelect} />
      {error ? <p role="alert">{error}</p> : null}
      <button type="button" onClick={handleNext} disabled={submitting}>
        {Number(pollNumber) === pollsData.length ? "Continue to Final Submission" : "Next"}
      </button>
      {submitting ? <Loader /> : null}
    </div>
  );
}
