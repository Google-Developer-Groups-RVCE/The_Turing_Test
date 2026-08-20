import axiosClient from './axiosClient';

export const submitR5Response = (text) => axiosClient.post('/r5/response', { text });
export const getMyR5Response = () => axiosClient.get('/r5/response/mine');
export const getR5Status = () => axiosClient.get('/r5/status');
export const getR5Options = () => axiosClient.get('/r5/options');
export const submitR5Vote = (optionIndex) => axiosClient.post('/r5/vote', { optionIndex });
export const getMyR5Vote = () => axiosClient.get('/r5/vote/mine');
export const getR5VotingStatus = () => axiosClient.get('/r5/voting-status');
export const getR5Results = () => axiosClient.get('/r5/results');
export const getAllR5AdminResponses = () => axiosClient.get('/r5/admin/responses');
export const selectR5Candidates = (selectedUsernames) => axiosClient.post('/r5/select-candidates', { selectedUsernames });
export const openR5Voting = () => axiosClient.post('/r5/open-voting');
export const showR5Results = () => axiosClient.post('/r5/show-results');
export const resetR5 = () => axiosClient.post('/r5/reset');
