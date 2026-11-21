import axios from 'axios';

// When accessed via a public tunnel URL or port 5000, use relative '/api' automatically!
// When running Vite dev server on port 5173 locally, point to http://localhost:5000/api.
const baseURL =
  window.location.port === '5173'
    ? 'http://localhost:5000/api'
    : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crs_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
