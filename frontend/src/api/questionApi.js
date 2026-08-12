import axiosClient from './axiosClient';

export const getQuestions = (roundId) => axiosClient.get(`/questions/${roundId}`);
export const getActiveQuestion = (roundId) => axiosClient.get(`/questions/${roundId}/active`);
export const createQuestion = (roundId, data) => axiosClient.post(`/questions/${roundId}`, data);
export const updateQuestion = (roundId, questionId, data) => axiosClient.put(`/questions/${roundId}/${questionId}`, data);
export const deleteQuestion = (roundId, questionId) => axiosClient.delete(`/questions/${roundId}/${questionId}`);

export const nextQuestion = (roundId) => axiosClient.post(`/questions/${roundId}/next`);
export const previousQuestion = (roundId) => axiosClient.post(`/questions/${roundId}/previous`);
export const setActiveQuestion = (roundId, questionId) => axiosClient.post(`/questions/${roundId}/activate/${questionId}`);
export const revealPoll = (roundId) => axiosClient.post(`/questions/${roundId}/reveal-poll`);
export const evaluateQuestion = (roundId) => axiosClient.post(`/questions/${roundId}/evaluate`);
export const reorderQuestions = (roundId, questionIds) => axiosClient.put(`/questions/${roundId}/reorder`, { questionIds });
export const overrideOption = (roundId, optionId, targetQuestionId = null) => axiosClient.post(`/questions/${roundId}/override-option`, { optionId, targetQuestionId });
