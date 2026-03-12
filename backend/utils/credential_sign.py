"""
Sign a credential hash using the KYC provider's private key.

Private key is read from env KYC_PROVIDER_PRIVATE_KEY (hex, with or without 0x).
Uses Ethereum signed message format so verifiers can recover the signer address.
"""

import os
from eth_account import Account
from eth_account.messages import encode_defunct


def _hash_hex_to_bytes(hash_hex: str) -> bytes:
    """Convert 0x-prefixed hex string to bytes (32 bytes for SHA-256)."""
    if hash_hex.startswith("0x"):
        hash_hex = hash_hex[2:]
    return bytes.fromhex(hash_hex)


def sign_credential_hash(credential_hash_hex: str) -> str:
    """
    Sign the credential hash (0x-prefixed hex) with the KYC provider's private key.
    Uses encode_defunct so the 32-byte hash is signed in Ethereum signed-message form.
    Returns 0x-prefixed signature hex (r || s || v).
    Raises RuntimeError with a clear message if key is missing, invalid, or hash is wrong length.
    """
    key_hex = (os.getenv("KYC_PROVIDER_PRIVATE_KEY") or "").strip()
    if not key_hex:
        raise RuntimeError("KYC_PROVIDER_PRIVATE_KEY is not set. Add it to backend/.env (run: python scripts/generate_kyc_key.py)")

    if key_hex.startswith("0x"):
        key_hex = key_hex[2:]
    if len(key_hex) != 64 or not all(c in "0123456789abcdefABCDEF" for c in key_hex):
        raise RuntimeError("KYC_PROVIDER_PRIVATE_KEY must be 64 hex characters (with or without 0x prefix)")

    try:
        account = Account.from_key(key_hex)
    except Exception as e:
        raise RuntimeError(f"KYC_PROVIDER_PRIVATE_KEY is invalid: {e!s}") from e

    if not credential_hash_hex or not isinstance(credential_hash_hex, str):
        raise RuntimeError("Credential hash is missing")
    try:
        hash_bytes = _hash_hex_to_bytes(credential_hash_hex)
    except Exception as e:
        raise RuntimeError(f"Invalid credential hash format: {e!s}") from e
    if len(hash_bytes) != 32:
        raise RuntimeError(f"Credential hash must be 32 bytes (got {len(hash_bytes)})")

    try:
        message = encode_defunct(primitive=hash_bytes)
        signed = account.sign_message(message)
        return "0x" + signed.signature.hex()
    except Exception as e:
        raise RuntimeError(f"Signing failed: {e!s}") from e


def verify_credential_signature(
    credential_hash_hex: str,
    signature_hex: str,
    expected_issuer_address: str,
) -> bool:
    """
    Verify that the credential hash was signed by the expected issuer (Use Case 7).
    Recovers the signer address from (hash, signature) and compares to KYC_PROVIDER_ADDRESS.
    Returns True if the signature is valid and signer matches (case-insensitive).
    """
    if not credential_hash_hex or not signature_hex or not expected_issuer_address:
        return False
    hash_bytes = _hash_hex_to_bytes(credential_hash_hex)
    if len(hash_bytes) != 32:
        return False
    try:
        message = encode_defunct(primitive=hash_bytes)
        sig = signature_hex.strip()
        if sig.startswith("0x"):
            sig = sig[2:]
        sig_bytes = bytes.fromhex(sig)
        recovered = Account.recover_message(message, signature=sig_bytes)
        return recovered and recovered.lower() == expected_issuer_address.strip().lower()
    except Exception:
        return False
