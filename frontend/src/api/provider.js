/**
 * Provider / stats API — use if backend exposes summary endpoints.
 * See API_CONTRACT.md.
 */
import { api } from './client';

const PREFIX = '/api';

export async function getStats() {
  try {
    const { data } = await api.get(`${PREFIX}/stats`);
    return data;
  } catch {
    return null;
  }
}
