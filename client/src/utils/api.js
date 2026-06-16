import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const api = axios.create({
  baseURL: API_BASE
});

// Attach auth token automatically for all requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('peppy_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['x-auth-token'] = token;
  }
  return config;
}, (err) => Promise.reject(err));

export default api;
