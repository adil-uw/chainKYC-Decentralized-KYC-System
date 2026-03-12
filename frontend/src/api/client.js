/**
 * Central Axios client for ChainKYC backend.
 * When VITE_API_BASE_URL is empty, requests go to same origin and Vite proxies /api to the backend.
 */
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

function isNetworkError(err) {
  const msg = (err?.message || '').toLowerCase();
  const code = err?.code || '';
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    msg.includes('network error') ||
    msg.includes('connection refused') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed')
  );
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;
    let message =
      data?.message ||
      data?.detail ||
      (Array.isArray(data?.detail)
        ? data.detail.map((e) => e.msg || JSON.stringify(e)).join(', ')
        : null) ||
      err.message ||
      'Request failed';

    if (isNetworkError(err)) {
      message =
        'Backend is not reachable. Start it with: cd backend && uvicorn main:app --reload (then open http://localhost:8000).';
    }

    return Promise.reject({ ...err, message });
  }
);

export default api;
