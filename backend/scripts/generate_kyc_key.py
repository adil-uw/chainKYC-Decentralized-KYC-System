"""
Generate a new Ethereum key pair for the KYC provider (issuer wallet).

Run once to create a private key, then add it to your .env as KYC_PROVIDER_PRIVATE_KEY.
Keep the private key secret. The address can be shared with verifiers to confirm signatures.
"""

from eth_account import Account

# Create a new random account (no argument = random key)
account = Account.create()

print("Add this to your .env file:\n")
# .key is HexBytes; .hex() gives 64 hex chars (no 0x)
print(f"KYC_PROVIDER_PRIVATE_KEY=0x{account.key.hex()}")
print("\nOptional: use this address as the known KYC provider for verification:")
print(f"KYC_PROVIDER_ADDRESS={account.address}")
print("\nKeep the private key secret. Do not commit .env to git.")
