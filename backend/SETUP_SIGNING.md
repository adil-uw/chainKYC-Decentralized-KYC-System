# Hash & Sign (Use Case 5) — Setup

For **Hash & Sign** to work, the backend must have the KYC provider's private key set so it can sign credentials.

## 1. Generate a key (one-time)

From the **backend** folder:

```bash
cd backend
python scripts/generate_kyc_key.py
```

You'll see output like:

```
Add this to your .env file:

KYC_PROVIDER_PRIVATE_KEY=0x...
KYC_PROVIDER_ADDRESS=0x...
```

## 2. Add to .env

Create or edit `backend/.env` and add:

```
KYC_PROVIDER_PRIVATE_KEY=0x<paste the 64 hex chars here>
```

Optional (for credential verification to check the signer):

```
KYC_PROVIDER_ADDRESS=0x<address from script output>
```

## 3. Verify the key (optional)

```bash
cd backend
python scripts/check_sign_key.py
```

You should see: `OK: Key is valid. Address: 0x...`

## 4. Restart the backend

Restart uvicorn so it loads the new env:

```bash
uvicorn main:app --reload
```

After this, **Hash & Sign** on the provider flow (Issue → Sign) should work.

If it still fails, the app will now show the **exact error** in the red toast (e.g. "Key not set", "Key must be 64 hex characters", "Invalid key"). Run `python scripts/check_sign_key.py` in the backend folder to confirm the key is valid.
