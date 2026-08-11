import axiosClient from './axiosClient';

export const getRounds = () => axiosClient.get('/rounds');
export const getCurrentRound = () => axiosClient.get('/rounds/current');
export const createRound = (data) => axiosClient.post('/rounds', data);
export const updateRound = (roundId, data) => axiosClient.put(`/rounds/${roundId}`, data);
export const reorderRounds = (roundIds) => axiosClient.put('/rounds/reorder', { roundIds });
export const deleteRound = (roundId) => axiosClient.delete(`/rounds/${roundId}`);

export const startRound = (roundId) => axiosClient.post(`/rounds/${roundId}/start`);
export const pauseRound = (roundId) => axiosClient.post(`/rounds/${roundId}/pause`);
export const resumeRound = (roundId) => axiosClient.post(`/rounds/${roundId}/resume`);
export const restartRound = (roundId) => axiosClient.post(`/rounds/${roundId}/restart`);
export const endRound = (roundId) => axiosClient.post(`/rounds/${roundId}/end`);
export const clearRoundResponses = (roundId) => axiosClient.post(`/rounds/${roundId}/clear-responses`);
export const extendRoundTime = (roundId, extraSeconds) => axiosClient.post(`/rounds/${roundId}/extend-time`, { extraSeconds });

export const resetEvent = () => axiosClient.post('/event/reset');
export const endEvent = () => axiosClient.post('/event/end');
export const seedSampleData = () => axiosClient.post('/event/seed-samples');
export const clearAllLiveData = () => axiosClient.delete('/event/clear-data');
export const getStage = (roundId) => axiosClient.get(`/rounds/${roundId}/stage`);
