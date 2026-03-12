/**
 * Wallet connection via MetaMask (ethers v6).
 */
import { BrowserProvider } from 'ethers';

const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isMetaMaskAvailable() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export function isValidEthereumAddress(address) {
  return typeof address === 'string' && ETHEREUM_ADDRESS_REGEX.test(address);
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed. Install the MetaMask extension and refresh.');
  }
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  const address = accounts[0];
  if (!address) throw new Error('No account selected');
  return { address, provider };
}

export async function getConnectedAddress() {
  if (!window.ethereum) return null;
  try {
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_accounts', []);
    return accounts[0] || null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to MetaMask account changes (switch account, disconnect).
 * @param {(address: string | null) => void} onAddress - called with new address or null when disconnected
 * @returns {() => void} unsubscribe function
 */
export function onAccountsChanged(onAddress) {
  if (typeof window === 'undefined' || !window.ethereum) return () => {};
  const on = window.ethereum.on || window.ethereum.addListener;
  if (typeof on !== 'function') return () => {};
  try {
    const handler = (accounts) => {
      const list = Array.isArray(accounts) ? accounts : [accounts];
      onAddress(list[0] || null);
    };
    on.call(window.ethereum, 'accountsChanged', handler);
    return () => {
      try {
        const remove = window.ethereum.removeListener || window.ethereum.off;
        if (typeof remove === 'function') remove.call(window.ethereum, 'accountsChanged', handler);
      } catch (_) {}
    };
  } catch (_) {
    return () => {};
  }
}
