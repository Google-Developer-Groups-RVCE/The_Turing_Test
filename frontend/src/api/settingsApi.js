import axiosClient from './axiosClient';

export const getSettings = () => axiosClient.get('/settings');
export const updateSettings = (data) => axiosClient.put('/settings', data);
export const getHealth = () => axiosClient.get('/health');
