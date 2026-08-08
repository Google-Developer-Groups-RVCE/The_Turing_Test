import axiosClient from './axiosClient';

export const getUsers = (params) => axiosClient.get('/users', { params });
export const createUser = (data) => axiosClient.post('/users', data);
export const getUser = (username) => axiosClient.get(`/users/${username}`);
export const updateUser = (username, data) => axiosClient.put(`/users/${username}`, data);
export const deleteUser = (username) => axiosClient.delete(`/users/${username}`);

export const uploadCSV = (formData) =>
  axiosClient.post('/users/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const exportCSV = () =>
  axiosClient.get('/users/export-csv', { responseType: 'blob' });

export const bulkDeleteUsers = (usernames) =>
  axiosClient.post('/users/bulk/delete', { usernames });

export const bulkBlockUsers = (usernames) =>
  axiosClient.post('/users/bulk/block', { usernames });

export const bulkUnblockUsers = (usernames) =>
  axiosClient.post('/users/bulk/unblock', { usernames });

export const bulkResetPasswords = (usernames) =>
  axiosClient.post('/users/bulk/reset-passwords', { usernames });
