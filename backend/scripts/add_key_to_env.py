"""Generate a KYC provider key and add it to backend/.env (or update if present)."""
import os
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"

from eth_account import Account
account = Account.create()
key_line = f"KYC_PROVIDER_PRIVATE_KEY=0x{account.key.hex()}"
addr_line = f"KYC_PROVIDER_ADDRESS={account.address}"

lines = []
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if line.strip().startswith("KYC_PROVIDER_PRIVATE_KEY="):
                continue
            if line.strip().startswith("KYC_PROVIDER_ADDRESS="):
                continue
            lines.append(line.rstrip())
else:
    lines = []

# Ensure we have a newline at end of existing content
while lines and lines[-1] == "":
    lines.pop()
if lines:
    lines.append("")
lines.append(key_line)
lines.append(addr_line)
lines.append("")

with open(env_path, "w") as f:
    f.write("\n".join(lines))

print("Added KYC_PROVIDER_PRIVATE_KEY and KYC_PROVIDER_ADDRESS to", env_path)
print("Restart the backend (uvicorn main:app --reload) for Hash & Sign to work.")
