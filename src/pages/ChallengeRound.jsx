import React, { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { submitPollAnswer } from "../api/responseService.js";
import ProgressBar from "../components/ProgressBar.jsx";
import Loader from "../components/Loader.jsx";
import ChallengeCard from "../components/ChallengeCard.jsx";
import { TopNav } from "./TeamEntry.jsx";

export default function ChallengeRound({ data, roundNumber, nextPath }) {
  const { questionNumber } = useParams();
  const navigate = useNavigate();
  const { teamId, answers, textAnswers, setAnswer, setTextAnswer } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const number = Number(questionNumber);
  const challenge = data[number - 1];

  if (!teamId) return <Navigate to="/" replace />;
  if (!challenge) return <Navigate to="/" replace />;

  const selectedOption = answers[challenge.id];
  const textValue = textAnswers?.[challenge.id] || "";
  const isText = challenge.type === "text";
  const isLast = number === data.length;

  const handleNext = async () => {
    if (isText ? textValue.trim().length < (challenge.minLength || 1) : !selectedOption) {
      setError(isText
        ? `Please enter at least ${challenge.minLength || 1} characters.`
        : "Please select an option before continuing.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await submitPollAnswer({
        teamId,
        pollId: challenge.id,
        optionKey: selectedOption,
        answerText: isText ? textValue.trim() : undefined
      });

      if (!isLast) {
        navigate(`/round${roundNumber}/${number + 1}`);
      } else {
        navigate(nextPath);
      }
    } catch {
      setError("Could not submit your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-bg" aria-hidden="true" />
      <TopNav />
      <div className="page-wrap">
        <div className="poll-screen">
          <div className="round-heading">
            <span>ROUND {roundNumber}</span>
            <strong>{roundNumber === 1 ? "LIVE CONVERSATIONS" : "IMAGE CHALLENGE"}</strong>
          </div>
          <ProgressBar current={number} total={data.length} />
          <ChallengeCard
            challenge={challenge}
            selectedOption={selectedOption}
            textValue={textValue}
            onSelect={(key) => setAnswer(challenge.id, key)}
            onTextChange={(value) => setTextAnswer(challenge.id, value)}
          />

          <div className="poll-actions">
            {error ? <p role="alert" className="poll-error">{error}</p> : null}
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className={`btn-glossy${isLast ? " final" : ""}`}
            >
              {isLast ? "Continue →" : "Next →"}
            </button>
            {submitting ? <Loader /> : null}
          </div>
        </div>
      </div>
    </>
  );
}
