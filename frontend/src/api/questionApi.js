import axiosClient from './axiosClient';

export const getQuestions = (roundId) => axiosClient.get(`/questions/${roundId}`);
export const getActiveQuestion = (roundId) => axiosClient.get(`/questions/${roundId}/active`);
export const createQuestion = (roundId, data) => axiosClient.post(`/questions/${roundId}`, data);
export const updateQuestion = (roundId, questionId, data) => axiosClient.put(`/questions/${roundId}/${questionId}`, data);
export const deleteQuestion = (roundId, questionId) => axiosClient.delete(`/questions/${roundId}/${questionId}`);
