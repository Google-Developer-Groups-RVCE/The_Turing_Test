import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { registerTeam } from "../api/responseService.js";
import Loader from "../components/Loader.jsx";

export default function TeamEntry() {
  const { setTeamId, setTeamName } = useSession();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a team name.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await registerTeam({ teamName: name.trim() });
      setTeamId(result.teamId);
      setTeamName(result.teamName || name.trim());
      navigate("/poll/1");
    } catch (err) {
      setError("Could not start the session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Decode the Context</h1>
      <p>Enter your team name to begin.</p>
      <form onSubmit={handleStart}>
        <label htmlFor="teamName">Team Name</label>
        <br />
        <input
          id="teamName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
        <br />
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={loading}>
          Start
        </button>
      </form>
      {loading ? <Loader label="Starting session..." /> : null}
    </div>
  );
}
