/**
 * Credentials API — aligned with backend (backend/routers/credentials_router.py).
 */
import { api } from './client';

const PREFIX = '/api/credentials';

/** GET /api/credentials/by-wallet/{address} — single credential + signature (for verify package) */
export async function getCredentialByWallet(walletAddress) {
  const { data } = await api.get(`${PREFIX}/by-wallet/${encodeURIComponent(walletAddress)}`);
  return data;
}

/** GET with ?format=package — returns only { credential, signature } for verify */
export async function getCredentialPackageByWallet(walletAddress) {
  const { data } = await api.get(
    `${PREFIX}/by-wallet/${encodeURIComponent(walletAddress)}`,
    { params: { format: 'package' } }
  );
  return data;
}

/** GET /api/credentials/by-wallet/{address}/list — list of credentials for wallet */
export async function listCredentialsByWallet(walletAddress) {
  const { data } = await api.get(`${PREFIX}/by-wallet/${encodeURIComponent(walletAddress)}/list`);
  return data;
}

/** GET /api/credentials/{id}/status — credential status (hash, registered, revoked, expired) */
export async function getCredentialStatus(credentialId) {
  const { data } = await api.get(`${PREFIX}/${encodeURIComponent(credentialId)}/status`);
  return data;
}

/** POST /api/credentials/issue/{kyc_request_id} — no body */
export async function issueCredential(kycRequestId) {
  const { data } = await api.post(`${PREFIX}/issue/${kycRequestId}`);
  return data;
}

/** POST /api/credentials/{id}/sign */
export async function signCredential(credentialId) {
  const id = String(credentialId ?? '').trim();
  const { data } = await api.post(`${PREFIX}/${encodeURIComponent(id)}/sign`);
  return data;
}

/** POST /api/credentials/{id}/register */
export async function registerCredentialOnChain(credentialId) {
  const { data } = await api.post(`${PREFIX}/${credentialId}/register`);
  return data;
}

/** POST /api/credentials/{id}/revoke — optional body: { reason } */
export async function revokeCredential(credentialId, reason) {
  const { data } = await api.post(`${PREFIX}/${credentialId}/revoke`, reason != null ? { reason } : {});
  return data;
}

/** POST /api/credentials/verify — body: { credential, signature } */
export async function verifyCredential(payload) {
  const { data } = await api.post(`${PREFIX}/verify`, payload);
  return data;
}
