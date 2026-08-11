import axiosClient from './axiosClient';

export const submitResponse = (roundId, answer) =>
  axiosClient.post(`/responses/${roundId}`, { answer });

export const submitSimulatedResponse = (roundId, answer) =>
  axiosClient.post(`/responses/${roundId}/simulated`, { answer });

export const getSimulatedResponse = (roundId, questionId) =>
  axiosClient.get(`/responses/${roundId}/simulated`, { params: { questionId } });

export const getResponses = (roundId, params) =>
  axiosClient.get(`/responses/${roundId}`, { params });

export const getMyResponse = (roundId, questionId) =>
  axiosClient.get(`/responses/${roundId}/mine`, { params: { questionId } });

export const exportResponses = (roundId) =>
  axiosClient.get(`/responses/${roundId}/export`, { responseType: 'blob' });

export const deleteResponses = (roundId, usernames) =>
  axiosClient.delete(`/responses/${roundId}`, { data: { usernames } });
