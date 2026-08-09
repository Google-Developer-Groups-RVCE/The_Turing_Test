import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getStoredSession, saveStoredSession, clearStoredSession } from "../utils/storage.js";

const SessionContext = createContext(null);

/**
 * Holds the team's identity and their in-progress poll answers for the
 * duration of the session. Backed by localStorage so a page refresh or a
 * flaky mobile connection doesn't lose the team's progress.
 */
export function SessionProvider({ children }) {
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [answers, setAnswers] = useState({}); // { challengeId: optionKey }
  const [textAnswers, setTextAnswers] = useState({});

  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setTeamId(stored.teamId || "");
      setTeamName(stored.teamName || "");
      setAnswers(stored.answers || {});
      setTextAnswers(stored.textAnswers || {});
    }
  }, []);

  useEffect(() => {
    saveStoredSession({ teamId, teamName, answers, textAnswers });
  }, [teamId, teamName, answers, textAnswers]);

  const setAnswer = (pollId, optionKey) => {
    setAnswers((prev) => ({ ...prev, [pollId]: optionKey }));
  };

  const setTextAnswer = (challengeId, value) => {
    setTextAnswers((prev) => ({ ...prev, [challengeId]: value }));
  };

  const resetSession = () => {
    setTeamId("");
    setTeamName("");
    setAnswers({});
    setTextAnswers({});
    clearStoredSession();
  };

  const value = useMemo(
    () => ({ teamId, setTeamId, teamName, setTeamName, answers, setAnswer, textAnswers, setTextAnswer, resetSession }),
    [teamId, teamName, answers, textAnswers]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
