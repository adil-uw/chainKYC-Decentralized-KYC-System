import { create } from 'zustand';

const KYC_REQUEST_ID_KEY = 'chainkyc_kycRequestId';
const WALLET_ADDRESS_KEY = 'chainkyc_walletAddress';

function safeGetSession(key) {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetSession(key, value) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (value == null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    }
  } catch (_) {}
}

export const useAppStore = create((set) => ({
  kycRequestId: safeGetSession(KYC_REQUEST_ID_KEY),
  walletAddress: safeGetSession(WALLET_ADDRESS_KEY),
  introDismissed: true,

  setKycRequestId: (id) => {
    set({ kycRequestId: id });
    safeSetSession(KYC_REQUEST_ID_KEY, id);
  },

  setWalletAddress: (address) => {
    set({ walletAddress: address });
    safeSetSession(WALLET_ADDRESS_KEY, address);
  },

  clearWalletAddress: () => {
    set({ walletAddress: null });
    safeSetSession(WALLET_ADDRESS_KEY, null);
  },

  dismissIntro: () => set({ introDismissed: true }),

  hydrateFromStorage: () => {
    const id = safeGetSession(KYC_REQUEST_ID_KEY);
    const wallet = safeGetSession(WALLET_ADDRESS_KEY);
    if (id || wallet) set((s) => ({ ...s, kycRequestId: id || s.kycRequestId, walletAddress: wallet || s.walletAddress }));
  },
}));

export function getStoredKycRequestId() {
  return safeGetSession(KYC_REQUEST_ID_KEY);
}
