import axiosClient from './axiosClient';

export const getLogs = (params) => axiosClient.get('/logs', { params });
