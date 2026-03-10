"""
Sign a credential hash using the KYC provider's private key.

Private key is read from env KYC_PROVIDER_PRIVATE_KEY (hex, with or without 0x).
Uses Ethereum signed message format so verifiers can recover the signer address.
"""

import os
from typing import Optional

from eth_account import Account
from eth_account.messages import encode_defunct


def _hash_hex_to_bytes(hash_hex: str) -> bytes:
    """Convert 0x-prefixed hex string to bytes (32 bytes for SHA-256)."""
    if hash_hex.startswith("0x"):
        hash_hex = hash_hex[2:]
    return bytes.fromhex(hash_hex)


def sign_credential_hash(credential_hash_hex: str) -> Optional[str]:
    """
    Sign the credential hash (0x-prefixed hex) with the KYC provider's private key.
    Uses encode_defunct so the 32-byte hash is signed in Ethereum signed-message form.
    Returns 0x-prefixed signature hex (r || s || v), or None if key is not configured.
    """
    key_hex = os.getenv("KYC_PROVIDER_PRIVATE_KEY")
    if not key_hex or not key_hex.strip():
        return None
    key_hex = key_hex.strip()
    if key_hex.startswith("0x"):
        key_hex = key_hex[2:]

    try:
        account = Account.from_key(key_hex)
    except Exception:
        return None

    hash_bytes = _hash_hex_to_bytes(credential_hash_hex)
    if len(hash_bytes) != 32:
        return None

    # Standard Ethereum signed message: prefix + message, then sign (verifiers can recover address)
    message = encode_defunct(primitive=hash_bytes)
    signed = account.sign_message(message)
    return "0x" + signed.signature.hex()
