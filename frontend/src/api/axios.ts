import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isAuthRoute =
          path.startsWith('/admin') ||
          path.startsWith('/dashboard') ||
          path.startsWith('/programs') ||
          path.startsWith('/gad-plan') ||
          path.startsWith('/accomplishments') ||
          path.startsWith('/data-encoding') ||
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
