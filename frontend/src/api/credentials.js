/**
 * Credentials API — align with actual backend when available.
 * See API_CONTRACT.md for expected contract.
 */
import { api } from './client';

const PREFIX = '/api';

export async function getCredentialsByWallet(walletAddress) {
  const { data } = await api.get(`${PREFIX}/credentials`, {
    params: { wallet: walletAddress },
  });
  return data;
}

export async function getCredential(credentialId) {
  const { data } = await api.get(`${PREFIX}/credentials/${credentialId}`);
  return data;
}

export async function issueCredential(kycRequestId) {
  const { data } = await api.post(`${PREFIX}/credentials/issue`, {
    kycRequestId,
  });
  return data;
}

export async function signCredential(credentialId) {
  const { data } = await api.post(`${PREFIX}/credentials/${credentialId}/sign`);
  return data;
}

export async function registerCredentialOnChain(credentialId) {
  const { data } = await api.post(
    `${PREFIX}/credentials/${credentialId}/register`
  );
  return data;
}

export async function revokeCredential(credentialId, reason) {
  const { data } = await api.post(
    `${PREFIX}/credentials/${credentialId}/revoke`,
    reason != null ? { reason } : {}
  );
  return data;
}

export async function verifyCredential(payload) {
  const { data } = await api.post(`${PREFIX}/credentials/verify`, payload);
  return data;
}
