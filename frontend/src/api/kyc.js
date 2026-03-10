/**
 * KYC API — aligned with backend (backend/routers/kyc_router.py).
 * Backend prefix: /api/kyc. Submit: POST /api/kyc/submit.
 */
import { api } from './client';

const PREFIX = '/api/kyc';

export async function submitKycRequest(body) {
  const { data } = await api.post(`${PREFIX}/submit`, body);
  return data;
}

/** Not yet in backend — placeholder for future GET /api/kyc/requests/:id */
export async function getKycRequest(kycRequestId) {
  const { data } = await api.get(`${PREFIX}/requests/${kycRequestId}`);
  return data;
}

/** Not yet in backend — placeholder for future GET /api/kyc/requests */
export async function listKycRequests(params = {}) {
  const { data } = await api.get(`${PREFIX}/requests`, { params });
  return data;
}

/** Not yet in backend — placeholder for future POST .../wallet */
export async function linkWallet(kycRequestId, walletAddress) {
  const { data } = await api.post(`${PREFIX}/requests/${kycRequestId}/wallet`, {
    walletAddress,
  });
  return data;
}

/** Not yet in backend — placeholder for future POST .../screen */
export async function screenKycRequest(kycRequestId, payload) {
  const { data } = await api.post(`${PREFIX}/requests/${kycRequestId}/screen`, payload);
  return data;
}
