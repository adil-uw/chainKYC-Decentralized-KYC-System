"""
Blockchain client for Use Case 6: Register credential hash on-chain.

Calls DecentralizedKYCCredentialRegistry (smart-contract/src/dKYCRegistry.sol):
  isRegistered(bytes32), registerCredential(bytes32, uint64), getCredentialStatus(bytes32).
Uses KYC provider private key to send the transaction (msg.sender must be an authorized issuer).

Config (env):
  RPC_URL or ETH_RPC_URL              — Ethereum node RPC (e.g. Sepolia)
  CONTRACT_ADDRESS or DKYC_REGISTRY_CONTRACT_ADDRESS — deployed contract address
  KYC_PROVIDER_PRIVATE_KEY            — issuer wallet key for sending tx

After deploy: contract admin must call addIssuer(KYC_PROVIDER_ADDRESS) so this
wallet can call registerCredential (onlyIssuer modifier).
"""

import logging
import os
from typing import Optional, Tuple

from eth_account import Account
from web3 import Web3

from config.contract_abi import DKYC_REGISTRY_ABI

logger = logging.getLogger(__name__)


def _get_config() -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """(rpc_url, contract_address, private_key). Prefer RPC_URL, CONTRACT_ADDRESS."""
    rpc = os.getenv("RPC_URL") or os.getenv("ETH_RPC_URL")
    addr = os.getenv("CONTRACT_ADDRESS") or os.getenv("DKYC_REGISTRY_CONTRACT_ADDRESS")
    key = os.getenv("KYC_PROVIDER_PRIVATE_KEY")
    return (rpc, addr, key)


def is_chain_configured() -> bool:
    """True if RPC_URL and CONTRACT_ADDRESS are set (real on-chain registration possible)."""
    rpc, addr, _ = _get_config()
    return bool(rpc and (rpc or "").strip() and addr and (addr or "").strip())


def _hash_hex_to_bytes32(hash_hex: str) -> bytes:
    """0x-prefixed 64-char hex (SHA-256) -> 32 bytes for bytes32."""
    if hash_hex.startswith("0x"):
        hash_hex = hash_hex[2:]
    if len(hash_hex) != 64:
        raise ValueError("Credential hash must be 32 bytes (64 hex chars)")
    return bytes.fromhex(hash_hex)


def _get_contract(w3: Web3):
    """Build contract instance from env CONTRACT_ADDRESS and DKYC_REGISTRY_ABI."""
    _, addr, _ = _get_config()
    if not addr:
        return None
    return w3.eth.contract(
        address=Web3.to_checksum_address(addr),
        abi=DKYC_REGISTRY_ABI,
    )


def is_registered_on_chain(credential_hash_hex: str) -> bool:
    """
    Call contract isRegistered(bytes32 credentialHash). View call, no tx.
    Returns True if hash is already registered (avoids duplicate tx).
    """
    rpc_url, contract_address, _ = _get_config()
    if not rpc_url or not contract_address:
        logger.warning("RPC_URL or CONTRACT_ADDRESS not set; skipping isRegistered check")
        return False
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            logger.warning("RPC not connected; skipping isRegistered check")
            return False
        contract = _get_contract(w3)
        if not contract:
            return False
        hash_bytes32 = _hash_hex_to_bytes32(credential_hash_hex)
        return bool(contract.functions.isRegistered(hash_bytes32).call())
    except Exception as e:
        logger.warning("isRegistered call failed: %s", e)
        return False


def register_credential_on_chain(
    credential_hash_hex: str,
    expiry_timestamp: int,
) -> str:
    """
    Call registerCredential(bytes32 credentialHash, uint64 expiry).
    Signs and sends tx with KYC_PROVIDER_PRIVATE_KEY; waits for receipt.
    Returns transaction hash (0x-prefixed hex).
    Raises RuntimeError with a clear message if config is missing or tx fails.
    """
    rpc_url, contract_address, key_hex = _get_config()
    if not rpc_url or not contract_address:
        raise RuntimeError(
            "Register on-chain is disabled: set RPC_URL (or ETH_RPC_URL) and CONTRACT_ADDRESS "
            "(or DKYC_REGISTRY_CONTRACT_ADDRESS) in backend/.env. Deploy the dKYCRegistry contract first."
        )
    if not key_hex or not key_hex.strip():
        raise RuntimeError(
            "Register on-chain requires KYC_PROVIDER_PRIVATE_KEY in backend/.env (same key used for signing)."
        )
    key_hex = key_hex.strip()
    if key_hex.startswith("0x"):
        key_hex = key_hex[2:]
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            raise RuntimeError("RPC not connected. Check RPC_URL in backend/.env (e.g. https://sepolia.infura.io/v3/YOUR_KEY).")
        account = Account.from_key(key_hex)
        contract = _get_contract(w3)
        if not contract:
            raise RuntimeError("CONTRACT_ADDRESS not set or invalid in backend/.env.")
        hash_bytes32 = _hash_hex_to_bytes32(credential_hash_hex)
        expiry_uint64 = int(expiry_timestamp) & 0xFFFFFFFFFFFFFFFF

        logger.info("Contract call start: registerCredential(hash=%s..., expiry=%s)", credential_hash_hex[:18], expiry_uint64)
        nonce = w3.eth.get_transaction_count(account.address)
        txn = contract.functions.registerCredential(
            hash_bytes32,
            expiry_uint64,
        ).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 200_000,
        })
        signed = account.sign_transaction(txn)
        raw_tx = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction", None)
        if not raw_tx:
            raise RuntimeError("Failed to sign transaction.")
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        tx_hash_hex = receipt["transactionHash"]
        tx_hash_str = tx_hash_hex.hex() if hasattr(tx_hash_hex, "hex") else str(tx_hash_hex)
        if not tx_hash_str.startswith("0x"):
            tx_hash_str = "0x" + tx_hash_str
        logger.info("Tx hash: %s", tx_hash_str)
        return tx_hash_str
    except RuntimeError:
        raise
    except Exception as e:
        logger.exception("registerCredential transaction failed: %s", e)
        raise RuntimeError(f"Contract call failed: {e!s}") from e


def get_credential_status(credential_hash_hex: str) -> Tuple[Optional[bool], Optional[bool], Optional[int]]:
    """
    Call contract getCredentialStatus(bytes32 credentialHash). View call, no tx.
    Returns (registered, revoked, expiry_timestamp) or (None, None, None) on failure.
    expiry_timestamp is Unix time (uint64 from contract).
    """
    rpc_url, contract_address, _ = _get_config()
    if not rpc_url or not contract_address:
        logger.warning("RPC_URL or CONTRACT_ADDRESS not set; getCredentialStatus unavailable")
        return (None, None, None)
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            logger.warning("RPC not connected; getCredentialStatus unavailable")
            return (None, None, None)
        contract = _get_contract(w3)
        if not contract:
            return (None, None, None)
        hash_bytes32 = _hash_hex_to_bytes32(credential_hash_hex)
        result = contract.functions.getCredentialStatus(hash_bytes32).call()
        # result is (registered, revoked, expiry, issuer)
        registered = bool(result[0])
        revoked = bool(result[1])
        expiry = int(result[2])
        return (registered, revoked, expiry)
    except Exception as e:
        logger.warning("getCredentialStatus call failed: %s", e)
        return (None, None, None)


def revoke_credential_on_chain(credential_hash_hex: str, reason_code: int = 0) -> Optional[str]:
    """
    Call contract revokeCredential(bytes32 credentialHash, uint8 reasonCode).
    Signs and sends tx with KYC_PROVIDER_PRIVATE_KEY (must be the issuer who registered).
    Returns transaction hash (0x-prefixed hex) or None on failure.
    """
    rpc_url, contract_address, key_hex = _get_config()
    if not rpc_url or not contract_address or not key_hex:
        logger.error("Missing RPC_URL, CONTRACT_ADDRESS, or KYC_PROVIDER_PRIVATE_KEY")
        return None
    key_hex = key_hex.strip()
    if key_hex.startswith("0x"):
        key_hex = key_hex[2:]
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            logger.error("RPC not connected")
            return None
        account = Account.from_key(key_hex)
        contract = _get_contract(w3)
        if not contract:
            return None
        hash_bytes32 = _hash_hex_to_bytes32(credential_hash_hex)
        reason_uint8 = int(reason_code) & 0xFF

        logger.info("Contract call: revokeCredential(hash=%s..., reasonCode=%s)", credential_hash_hex[:18], reason_uint8)
        nonce = w3.eth.get_transaction_count(account.address)
        txn = contract.functions.revokeCredential(hash_bytes32, reason_uint8).build_transaction({
            "from": account.address,
            "nonce": nonce,
            "gas": 150_000,
        })
        signed = account.sign_transaction(txn)
        raw_tx = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction", None)
        if not raw_tx:
            logger.error("Signed tx has no raw_transaction / rawTransaction")
            return None
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        if receipt.get("status") == 0:
            logger.error("Revoke transaction reverted (status=0)")
            return None
        tx_hash_hex = receipt["transactionHash"]
        tx_hash_str = tx_hash_hex.hex() if hasattr(tx_hash_hex, "hex") else str(tx_hash_hex)
        if not tx_hash_str.startswith("0x"):
            tx_hash_str = "0x" + tx_hash_str
        logger.info("Revoke tx hash: %s", tx_hash_str)
        return tx_hash_str
    except Exception as e:
        logger.exception("revokeCredential transaction failed: %s", e)
        return None
