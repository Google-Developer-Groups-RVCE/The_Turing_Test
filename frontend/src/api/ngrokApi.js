import axiosClient from './axiosClient';

export const getNgrokStatus = () => axiosClient.get('/ngrok/status');
export const startNgrok = (data) => axiosClient.post('/ngrok/start', data);
export const stopNgrok = () => axiosClient.post('/ngrok/stop');
