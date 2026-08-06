import apiClient from "./apiClient.js";

/**
 * Registers/identifies a team at the start of the session.
 * Expected backend route: POST /api/teams
 */
export async function registerTeam({ teamName }) {
  const { data } = await apiClient.post("/teams", { teamName });
  return data; // expected: { teamId, teamName }
}

/**
 * Submits a single poll answer as soon as the team votes.
 * Sending each answer immediately (rather than batching at the end)
 * keeps payloads small, which matters when 150-200 teams may be
 * submitting around the same time.
 * Expected backend route: POST /api/responses/poll
 */
export async function submitPollAnswer({ teamId, pollId, optionKey }) {
  const { data } = await apiClient.post("/responses/poll", {
    teamId,
    pollId,
    optionKey
  });
  return data;
}

/**
 * Submits the final hidden-profile guess after all five polls.
 * Expected backend route: POST /api/responses/final
 */
export async function submitFinalGuess({ teamId, predictedAge, predictedProfession, predictedHobby }) {
  const { data } = await apiClient.post("/responses/final", {
    teamId,
    predictedAge,
    predictedProfession,
    predictedHobby
  });
  return data;
}

/**
 * Optional: fetch the leaderboard once scoring has been applied server-side.
 * Expected backend route: GET /api/leaderboard
 */
export async function getLeaderboard() {
  const { data } = await apiClient.get("/leaderboard");
  return data;
}
