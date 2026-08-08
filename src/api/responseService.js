import apiClient from "./apiClient.js";

function getLocalFallbackResponse(message, payload = {}) {
  console.warn(message);
  return {
    success: true,
    localFallback: true,
    ...payload
  };
}

/**
 * Registers/identifies a team at the start of the session.
 * Expected backend route: POST /api/teams
 * Falls back to a local session id when the backend is unavailable.
 */
export async function registerTeam({ teamName }) {
  try {
    const { data } = await apiClient.post("/teams", { teamName });
    return data; // expected: { teamId, teamName }
  } catch (error) {
    return getLocalFallbackResponse(
      "Backend unavailable; using local fallback for team registration.",
      {
        teamId: `local-${Date.now()}`,
        teamName: teamName?.trim() || "Local Team"
      }
    );
  }
}

/**
 * Submits a single poll answer as soon as the team votes.
 * Sending each answer immediately (rather than batching at the end)
 * keeps payloads small, which matters when 150-200 teams may be
 * submitting around the same time.
 * Expected backend route: POST /api/responses/poll
 */
export async function submitPollAnswer({ teamId, pollId, optionKey }) {
  try {
    const { data } = await apiClient.post("/responses/poll", {
      teamId,
      pollId,
      optionKey
    });
    return data;
  } catch (error) {
    return getLocalFallbackResponse(
      "Backend unavailable; storing poll answer locally.",
      { teamId, pollId, optionKey }
    );
  }
}

/**
 * Submits the final hidden-profile guess after all five polls.
 * Expected backend route: POST /api/responses/final
 */
export async function submitFinalGuess({ teamId, predictedAge, predictedProfession, predictedHobby }) {
  try {
    const { data } = await apiClient.post("/responses/final", {
      teamId,
      predictedAge,
      predictedProfession,
      predictedHobby
    });
    return data;
  } catch (error) {
    return getLocalFallbackResponse(
      "Backend unavailable; storing final guess locally.",
      { teamId, predictedAge, predictedProfession, predictedHobby }
    );
  }
}

/**
 * Optional: fetch the leaderboard once scoring has been applied server-side.
 * Expected backend route: GET /api/leaderboard
 */
export async function getLeaderboard() {
  try {
    const { data } = await apiClient.get("/leaderboard");
    return data;
  } catch (error) {
    return getLocalFallbackResponse("Backend unavailable; leaderboard is unavailable locally.", {
      leaderboard: []
    });
  }
}
