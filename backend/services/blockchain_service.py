"""
Blockchain client for Use Case 6: Register credential hash on-chain.

Calls dKYCRegistry contract: isRegistered(bytes32), registerCredential(bytes32, uint64).
Uses KYC provider private key to send the transaction (msg.sender = issuer).

Config (env):
  RPC_URL or ETH_RPC_URL              — Ethereum node RPC
  CONTRACT_ADDRESS or DKYC_REGISTRY_CONTRACT_ADDRESS — deployed contract
  KYC_PROVIDER_PRIVATE_KEY            — issuer wallet key for sending tx
  KYC_PROVIDER_ADDRESS                — (optional) for logging

TODO: When teammate deploys, set CONTRACT_ADDRESS in .env and paste final ABI
      in config/contract_abi.py if different from minimal placeholder.
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
) -> Optional[str]:
    """
    Call registerCredential(bytes32 credentialHash, uint64 expiry).
    Signs and sends tx with KYC_PROVIDER_PRIVATE_KEY; waits for receipt.
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
            logger.error("Signed tx has no raw_transaction / rawTransaction")
            return None
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        tx_hash_hex = receipt["transactionHash"]
        tx_hash_str = tx_hash_hex.hex() if hasattr(tx_hash_hex, "hex") else str(tx_hash_hex)
        if not tx_hash_str.startswith("0x"):
            tx_hash_str = "0x" + tx_hash_str
        logger.info("Tx hash: %s", tx_hash_str)
        return tx_hash_str
    except Exception as e:
        logger.exception("registerCredential transaction failed: %s", e)
        return None
