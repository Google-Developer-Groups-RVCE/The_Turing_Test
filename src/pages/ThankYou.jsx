import React from "react";
import { useSession } from "../context/SessionContext.jsx";

export default function ThankYou() {
  const { teamName } = useSession();

  return (
    <div>
      <h1>Thank You{teamName ? `, ${teamName}` : ""}!</h1>
      <p>Your responses have been recorded. Please wait for the leaderboard results.</p>
    </div>
  );
}
