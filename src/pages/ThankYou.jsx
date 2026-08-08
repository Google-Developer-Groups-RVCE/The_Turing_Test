import React from "react";
import { useSession } from "../context/SessionContext.jsx";
import { TopNav } from "./TeamEntry.jsx";

export default function ThankYou() {
  const { teamName } = useSession();

  return (
    <>
      <div className="page-bg" aria-hidden="true" />
      <TopNav />
      <div className="page-wrap">
        <div className="thankyou-screen">
          <h1 className="thankyou-title">
            Thank You{teamName ? `, ${teamName}` : ""}! 🎉
          </h1>
          <p className="thankyou-sub">
            Your responses have been recorded. Please wait for the leaderboard results.
          </p>
        </div>
      </div>
    </>
  );
}
