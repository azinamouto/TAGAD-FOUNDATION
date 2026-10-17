import axios from 'axios';
import { apiUrl } from './apiUrl';

const api = axios.create({
  baseURL: apiUrl(''),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tagad_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tagad_token');
      localStorage.removeItem('tagad_user');
      localStorage.removeItem('tagad_refresh_token');
      localStorage.removeItem('tagad_roles');
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isAuthRoute =
          path.startsWith('/admin') ||
          path.startsWith('/dashboard') ||
          path.startsWith('/programs') ||
          path.startsWith('/gad-plan') ||
          path.startsWith('/accomplishments') ||
          path.startsWith('/data-encoding') ||
          path.startsWith('/barangay-statistics') ||
          path.startsWith('/beneficiaries') ||
          path.startsWith('/reports') ||
          path.startsWith('/users');

        if (isAuthRoute && path !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
