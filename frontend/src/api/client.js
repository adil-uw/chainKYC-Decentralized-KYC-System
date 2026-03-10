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
    const data = err.response?.data;
    const message =
      data?.message ||
      data?.detail ||
      (Array.isArray(data?.detail)
        ? data.detail.map((e) => e.msg || JSON.stringify(e)).join(', ')
        : null) ||
      err.message ||
      'Request failed';
    return Promise.reject({ ...err, message });
  }
);

export default api;
