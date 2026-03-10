import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const KYC_REQUEST_ID_KEY = 'chainkyc_kycRequestId';

export const useAppStore = create(
  persist(
    (set) => ({
      kycRequestId: null,
      walletAddress: null,
      introDismissed: false,

      setKycRequestId: (id) => {
        set({ kycRequestId: id });
        if (id != null) {
          try {
            sessionStorage.setItem(KYC_REQUEST_ID_KEY, id);
          } catch (_) {}
        } else {
          try {
            sessionStorage.removeItem(KYC_REQUEST_ID_KEY);
          } catch (_) {}
        }
      },

      setWalletAddress: (address) => set({ walletAddress: address }),

      dismissIntro: () => set({ introDismissed: true }),

      hydrateFromStorage: () => {
        try {
          const id = sessionStorage.getItem(KYC_REQUEST_ID_KEY);
          if (id) set((s) => ({ ...s, kycRequestId: id }));
        } catch (_) {}
      },
    }),
    {
      name: 'chainkyc-app',
      partialize: (s) => ({ introDismissed: s.introDismissed }),
    }
  )
);

export function getStoredKycRequestId() {
  try {
    return sessionStorage.getItem(KYC_REQUEST_ID_KEY);
  } catch {
    return null;
  }
}
