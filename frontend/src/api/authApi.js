import axiosClient from './axiosClient';

/** Register a new participant */
export const register = (username, password, name) =>
  axiosClient.post('/auth/register', { username, password, name });

/** Login and receive JWT */
export const login = (username, password) =>
  axiosClient.post('/auth/login', { username, password });

/** Logout — server invalidates session entry */
export const logout = () =>
  axiosClient.post('/auth/logout');

/** Get currently authenticated user profile */
export const getMe = () =>
  axiosClient.get('/auth/me');
