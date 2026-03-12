# What to paste so Verify passes

Verification **passes** (Signature: Valid) only when the **credential** and **signature** are the **same pair** from your backend.

---

## Copy-paste this (works with backend running)

**1. Credential JSON** — paste in the first box on the Verify Credential page:

```json
{
  "credentialId": "cred_69afc80d8f732cf3dc562c90",
  "issuer": "KYCProvider",
  "subjectWallet": "0x742d35Cc6634C0532925a3b844Bc454e4438f22e",
  "identityVerified": true,
  "idType": "ssn",
  "issuedAt": "2026-03-10T07:28:13.015000",
  "expiry": "2027-03-10T07:28:13.015000",
  "status": "active"
}
```

**2. Signature** — paste in the second box:

```
0x76ab5b196f5190209578a16839701257d9d58aba4158cbe49287878c8686cd59692350a5c3741c4aa7c70474fb70c1c33d36eaf7f56d581f26bb1212cb09a01d1b
```

Then click **Verify**. You should see **Signature: Valid**.

---

## Or get the pair from the API yourself (Step 1)

With the **backend running** on port 8000, open this URL in your browser (use a wallet that has a **signed** credential):

```
http://127.0.0.1:8000/api/credentials/by-wallet/YOUR_WALLET_ADDRESS
```

Replace `YOUR_WALLET_ADDRESS` with a wallet that has an issued credential that was **Hash & Sign** (e.g. the wallet you see in **My Credentials**).

You get a JSON response like:

```json
{
  "credentialId": "cred_...",
  "credential": {
    "credentialId": "cred_...",
    "issuer": "KYCProvider",
    "subjectWallet": "0x...",
    "identityVerified": true,
    "idType": "ssn",
    "issuedAt": "2026-...",
    "expiry": "2027-...",
    "status": "active"
  },
  "signature": "0x...",
  "message": "Credential fetched successfully"
}
```

---

## Step 2 — Paste in the Verify page

1. **Credential JSON** — Paste only the **`credential`** object (the inner object).  
   So copy from `"credential": {` through the closing `}` of that object (do not include `"credentialId"`, `"signature"`, or `"message"` at the top level).

2. **Signature** — Paste the **`signature`** value (the long `0x...` string).

Then click **Verify**. You should see **Signature: Valid**.

---

## Example (replace with your real response)

- **Credential JSON** (paste in first box):
```json
{
  "credentialId": "cred_67890abcdef",
  "issuer": "KYCProvider",
  "subjectWallet": "0x742d35Cc6634C0532925a0b8e8a1c2d3e4f5a6b7",
  "identityVerified": true,
  "idType": "ssn",
  "issuedAt": "2026-03-11T08:40:42.031Z",
  "expiry": "2027-03-11T08:40:42.031Z",
  "status": "active"
}
```

- **Signature** (paste in second box):  
  The exact `0x...` string from the API response’s `"signature"` field.

Use the **real** values from your `GET /api/credentials/by-wallet/YOUR_WALLET` response so the two match. Then it passes.
