/**
 * KYC API — aligned with backend (backend/routers/kyc_router.py).
 * Backend: POST /submit, POST /{id}/screen, POST /{id}/link-wallet.
 */
import { api } from './client';

const PREFIX = '/api/kyc';

export async function submitKycRequest(body) {
  const { data } = await api.post(`${PREFIX}/submit`, body);
  return data;
}

/** GET /api/kyc/requests/{id} — single KYC request (status page). Backend auto-approves pending, so response is always approved unless rejected. */
export async function getKycRequest(kycRequestId) {
  const id = String(kycRequestId ?? '').trim();
  const { data } = await api.get(`${PREFIX}/requests/${encodeURIComponent(id)}`, {
    params: { _: Date.now() },
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  return data;
}

/** GET /api/kyc/requests — list KYC requests; optional query: status=pending|approved|rejected */
export async function listKycRequests(params = {}) {
  const { data } = await api.get(`${PREFIX}/requests`, { params });
  return data;
}

/** POST /api/kyc/{kyc_request_id}/link-wallet — body: { walletAddress } */
export async function linkWallet(kycRequestId, walletAddress) {
  const { data } = await api.post(`${PREFIX}/${kycRequestId}/link-wallet`, {
    walletAddress,
  });
  return data;
}

/** POST /api/kyc/{kyc_request_id}/screen — no body */
export async function screenKycRequest(kycRequestId) {
  const { data } = await api.post(`${PREFIX}/${kycRequestId}/screen`);
  return data;
}
