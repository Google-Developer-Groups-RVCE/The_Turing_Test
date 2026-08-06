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
  const [answers, setAnswers] = useState({}); // { pollId: "A" | "B" | "C" }

  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setTeamId(stored.teamId || "");
      setTeamName(stored.teamName || "");
      setAnswers(stored.answers || {});
    }
  }, []);

  useEffect(() => {
    saveStoredSession({ teamId, teamName, answers });
  }, [teamId, teamName, answers]);

  const setAnswer = (pollId, optionKey) => {
    setAnswers((prev) => ({ ...prev, [pollId]: optionKey }));
  };

  const resetSession = () => {
    setTeamId("");
    setTeamName("");
    setAnswers({});
    clearStoredSession();
  };

  const value = useMemo(
    () => ({ teamId, setTeamId, teamName, setTeamName, answers, setAnswer, resetSession }),
    [teamId, teamName, answers]
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
