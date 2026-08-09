import axiosClient from './axiosClient';

export const submitResponse = (roundId, answer) =>
  axiosClient.post(`/responses/${roundId}`, { answer });

export const getResponses = (roundId, params) =>
  axiosClient.get(`/responses/${roundId}`, { params });

export const getMyResponse = (roundId) =>
  axiosClient.get(`/responses/${roundId}/mine`);

export const exportResponses = (roundId) =>
  axiosClient.get(`/responses/${roundId}/export`, { responseType: 'blob' });

export const deleteResponses = (roundId, usernames) =>
  axiosClient.delete(`/responses/${roundId}`, { data: { usernames } });
