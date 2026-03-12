# Verify Credential Demo — Show Your Professor (Use Case 7)

This shows that **credential verification** works: the backend verifies the issuer signature and returns a clear result.

---

## Option 1: One-command script (recommended)

**Prerequisite:** Backend running on port 8000, and at least one credential that has been **issued** and **Hash & Sign** (Provider Dashboard).

```bash
cd backend
python scripts/demo_verify_pass.py
```

**What to show:** The script prints the **Verification Result** JSON and then either:
- **PASS: Signature is valid** — the credential was signed by the KYC provider and the signature matches.
- **PASS: Full verification status is VALID** — when the credential is also registered on-chain and not revoked/expired.

Copy the terminal output (the JSON + the PASS line) into a document or screenshot for your professor.

**Example of a passing run (what to show):**

```
=== ChainKYC Verify Credential Demo (Use Case 7) ===

Step 1: Retrieved credential + signature for wallet 0x9c8725dfb75259391...
Step 2: Called POST /api/credentials/verify with that credential and signature

--- Verification Result ---
{
  "credentialHash": "0x6ef9b8f1d6fa05469801367ba9fa2bc0d812ffc79f0161bde213960c8670e513",
  "signatureValid": true,
  "registeredOnChain": false,
  "revoked": false,
  "expired": false,
  "verificationStatus": "invalid",
  "message": "Credential verification failed"
}
---
*** PASS: Signature is valid. The credential was signed by the KYC provider. ***
```

*(signatureValid: true is the key proof; verificationStatus can be "invalid" if on-chain is not set up.)*

---

## Option 2: Verify page — Load from wallet (easiest)

1. **Start backend and frontend** (see RUN_INSTRUCTIONS.md).
2. **Get a credential package**
   - In the app, go to **My Credentials**, connect the wallet that has an issued credential.
   - Open a credential and copy the **credential JSON** and **signature** (or use “Download” if available).
3. **Verify**
   - Go to **Verify Credential**.
   - Paste the **credential JSON** and **signature**.
   - Click **Verify**.
4. **Show the result**
   - The page shows **Signature: Valid** (or Invalid), **On-chain**, **Revoked**, **Expired**, and **Verification result (JSON)**.
   - Use **Copy JSON** or **Download JSON** and attach that file/snippet as proof.

---

## Option 3: cURL (copy-paste for professor)

**Step A — Get credential + signature** (replace `WALLET` with a wallet that has a signed credential):

```bash
curl -s "http://127.0.0.1:8000/api/credentials/by-wallet/WALLET?format=package"
```

Example (if your wallet is `0x9c8725dfb7525939145747bed232da41659dcfad`):

```bash
curl -s "http://127.0.0.1:8000/api/credentials/by-wallet/0x9c8725dfb7525939145747bed232da41659dcfad?format=package"
```

Save the output as `package.json`.

**Step B — Verify** (use the same JSON as body):

```bash
curl -s -X POST "http://127.0.0.1:8000/api/credentials/verify" \
  -H "Content-Type: application/json" \
  -d @package.json
```

**What to show:** The response JSON, e.g.:

```json
{
  "credentialHash": "0x...",
  "signatureValid": true,
  "registeredOnChain": false,
  "revoked": false,
  "expired": false,
  "verificationStatus": "invalid",
  "message": "Credential verification failed"
}
```

- **signatureValid: true** → Proof that the **signature verification passes** (issuer signed this credential).
- **verificationStatus: "valid"** → Full pass (signature + on-chain + not revoked + not expired). If you don’t run on-chain, **signatureValid: true** is still the important part to show.

---

## Summary for your professor

- **Use Case 7 (Verify Credential):** A verifier (e.g. bank) sends the credential JSON + signature to `POST /api/credentials/verify`.
- **Backend:** Recomputes the credential hash, verifies the issuer signature, and (when configured) checks on-chain status.
- **Proof:** Run `python scripts/demo_verify_pass.py` with the backend up and show the printed **Verification Result** and the **PASS** line; or use the UI **Verify Credential** page and show the result JSON (Copy/Download).
