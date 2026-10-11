import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject admin JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('unidrop_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to format errors consistently
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || 'Unable to connect to UniDrop server.',
    };
    return Promise.reject(errorData);
  }
);
