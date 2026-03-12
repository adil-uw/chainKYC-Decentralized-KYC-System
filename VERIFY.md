# How to Verify the Code

## 1. Automated API tests (backend)

**Prerequisite:** Backend running on port 8000.

```bash
cd backend
python run_api_tests.py
```

**Expected:** `Result: 14 passed, 0 failed`

These 14 tests cover:
- Health & root
- KYC submit (valid, missing fields, no SSN/driver)
- Stats, KYC list, KYC screen
- Credentials: verify (no body → 400), status/issue/sign/revoke/list (not found or invalid → 404/400)

---

## 2. Frontend build

```bash
cd frontend
npm install
npm run build
```

**Expected:** Build completes with no errors (e.g. `✓ built in X.XXs`).

---

## 3. Manual verification in the UI

1. **Start backend** (Terminal 1):
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   Check log: `MongoDB: connected to chainkyc-cluster...` and `KYC signing key: configured`.

2. **Start frontend** (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```
   Open the URL shown (e.g. http://localhost:3018).

3. **Verify flows:**
   - **Submit KYC** → Get a KYC Request ID, status shows approved.
   - **KYC Status** → Enter ID, see approved.
   - **Connect Wallet** → Connect MetaMask, link to KYC ID.
   - **Provider Dashboard** → See stats, list of approved requests.
   - **Issue Credential** → Issue for an approved KYC; note credential ID.
   - **Hash & Sign** → Sign that credential (must have `KYC_PROVIDER_PRIVATE_KEY` in backend/.env).
   - **Register On-Chain** → Register that credential (demo mode if no RPC/contract).
   - **My Credentials** → Connect same wallet; see issued credentials.
   - **Verify Credential** → Paste credential JSON + signature; get verification result (copy/download JSON).

4. **Test Cases page**  
   Open `/test-cases` in the app to see the list of API scenarios and expected outcomes.

---

## 4. How to validate users

ChainKYC supports two kinds of validation:

### A. KYC validation (identity check)

- User submits KYC (Submit KYC page) with full name, DOB, address, and SSN or driver’s license.
- Backend validates required fields and runs screening (e.g. blacklist). Approved requests get status `approved`.
- **Check status:** Use **KYC Status** page with the KYC Request ID, or call `GET /api/kyc/requests/{id}`. If `status === "approved"`, the user’s identity is validated for issuing a credential.

### B. Credential verification (validating a user presenting a credential)

When a **verifier** (e.g. bank) needs to validate that a user’s credential is real and current:

1. **User presents** their credential JSON and the issuer **signature** (from My Credentials → credential details, or from the provider after Hash & Sign).
2. **Verifier** sends both to the backend:
   - **Endpoint:** `POST /api/credentials/verify`
   - **Body:** `{ "credential": { ... credential JSON ... }, "signature": "0x..." }`
3. **Backend**:
   - Recomputes the credential hash (same 6 fields as signing).
   - Verifies the **issuer signature** (KYC provider’s key).
   - Checks on-chain (or DB in demo): **registered**, **not revoked**, **not expired**.
4. **Response** includes `verificationStatus: "valid"` or `"invalid"` and booleans: `signatureValid`, `registeredOnChain`, `revoked`, `expired`.

**In the UI:** Use the **Verify Credential** page: paste the credential JSON and signature, click Verify. You get a result with **Copy JSON** / **Download JSON** to keep a record for user validation.

**Rule:** A user is considered **valid** (credential accepted) only when `verificationStatus === "valid"`, i.e. signature valid, registered on-chain, not revoked, and not expired.

---

## 5. Quick checklist

| Check | Command / Action |
|-------|-------------------|
| Backend health | `curl http://127.0.0.1:8000/api/health` → `{"status":"ok"}` |
| API tests | `cd backend && python run_api_tests.py` → 14 passed |
| Frontend build | `cd frontend && npm run build` → success |
| MongoDB in use | Backend log shows `MongoDB: connected to chainkyc-cluster...` |
