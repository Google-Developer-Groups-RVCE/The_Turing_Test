import axiosClient from './axiosClient';

export const getLeaderboard = () => axiosClient.get('/leaderboard');
export const getRoundLeaderboard = (roundId) => axiosClient.get(`/leaderboard/${roundId}`);
export const overrideScore = (username, score) =>
  axiosClient.post('/leaderboard/override', { username, score });
export const resetLeaderboard = () => axiosClient.post('/leaderboard/reset');
export const recalculateLeaderboard = () => axiosClient.post('/leaderboard/recalculate');
