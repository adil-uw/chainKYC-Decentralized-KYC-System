/**
 * Central Axios client for ChainKYC backend.
 * Base URL from env; update paths when backend is available to match actual routes.
 */
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      (Array.isArray(err.response?.data?.detail)
        ? err.response.data.detail.map((e) => e.msg || JSON.stringify(e)).join(', ')
        : err.message) ||
      'Request failed';
    return Promise.reject({ ...err, message });
  }
);

export default api;
