/**
 * Wallet connection via MetaMask (ethers v6).
 */
import { BrowserProvider } from 'ethers';

const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isValidEthereumAddress(address) {
  return typeof address === 'string' && ETHEREUM_ADDRESS_REGEX.test(address);
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  const address = accounts[0];
  if (!address) throw new Error('No account selected');
  return { address, provider };
}

export async function getConnectedAddress() {
  if (!window.ethereum) return null;
  const provider = new BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_accounts', []);
  return accounts[0] || null;
}
