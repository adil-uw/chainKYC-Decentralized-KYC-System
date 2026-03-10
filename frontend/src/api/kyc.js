/**
 * KYC API — align paths and payloads with actual backend when available.
 * See API_CONTRACT.md for expected contract.
 */
import { api } from './client';

const PREFIX = '/api';

export async function submitKycRequest(body) {
  const { data } = await api.post(`${PREFIX}/kyc/requests`, body);
  return data;
}

export async function getKycRequest(kycRequestId) {
  const { data } = await api.get(`${PREFIX}/kyc/requests/${kycRequestId}`);
  return data;
}

export async function listKycRequests(params = {}) {
  const { data } = await api.get(`${PREFIX}/kyc/requests`, { params });
  return data;
}

export async function linkWallet(kycRequestId, walletAddress) {
  const { data } = await api.post(`${PREFIX}/kyc/requests/${kycRequestId}/wallet`, {
    walletAddress,
  });
  return data;
}

export async function screenKycRequest(kycRequestId, payload) {
  const { data } = await api.post(
    `${PREFIX}/kyc/requests/${kycRequestId}/screen`,
    payload
  );
  return data;
}
