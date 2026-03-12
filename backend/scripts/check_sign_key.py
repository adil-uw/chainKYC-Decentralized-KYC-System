"""
Check that KYC_PROVIDER_PRIVATE_KEY is set and valid.
Run from project root or backend: python scripts/check_sign_key.py
"""
import os
import sys
from pathlib import Path

# Load .env from backend directory
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=env_path)
else:
    print("No backend/.env file found.")
    sys.exit(1)

key = (os.getenv("KYC_PROVIDER_PRIVATE_KEY") or "").strip()
if not key:
    print("KYC_PROVIDER_PRIVATE_KEY is not set in .env")
    sys.exit(1)

if key.startswith("0x"):
    key = key[2:]
if len(key) != 64 or not all(c in "0123456789abcdefABCDEF" for c in key):
    print("KYC_PROVIDER_PRIVATE_KEY must be 64 hex characters (optional 0x prefix)")
    sys.exit(1)

try:
    from eth_account import Account
    account = Account.from_key(key)
    print("OK: Key is valid. Address:", account.address)
except Exception as e:
    print("Invalid key:", e)
    sys.exit(1)
