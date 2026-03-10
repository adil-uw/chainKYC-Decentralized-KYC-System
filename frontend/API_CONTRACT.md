# ChainKYC Frontend — API Contract (Backend-Alignment Target)

**Backend** lives in `backend/` (FastAPI). This doc reflects the actual backend where implemented; other endpoints are placeholders for future use cases.

## Base

- **Base path:** configurable via `VITE_API_BASE_URL` (e.g. `http://localhost:8000`). Frontend uses `/api/kyc` etc.; ensure backend CORS allows the frontend origin.
- **Error body:** Backend returns `{"message": "..."}` for 400/409/500 (see `backend/main.py` and `backend/routers/kyc_router.py`).

---

## 1. KYC Submission — **implemented in backend**

- **POST** `/api/kyc/submit` (router prefix `/api/kyc`, route `/submit`)
- **Request body (camelCase):**
  - `fullName` (string, required)
  - `dateOfBirth` (string, required)
  - `address` (string, required)
  - At least one of: `ssn`, `driverLicenseNumber` (validated by schema)
  - Optional: `email`, `phoneNumber`
- **Response (201):**
  - `message`, `kycRequestId`, `status` (e.g. `"pending"`)
- **Errors:** 400 (validation / missing identity proof), 409 (duplicate pending request), 500 (e.g. DB failure)

---

## 2. KYC Status

- **GET** `/kyc/requests/{kycRequestId}` or `/api/kyc/requests/{id}`
- **Path:** `kycRequestId`
- **Response (200):**
  - `kycRequestId`, `fullName` (or masked), `status` (`pending` | `approved` | `rejected`)
  - `rejectionReason` (optional)
  - `createdAt`, `updatedAt`, etc.
- **Errors:** 404 (not found)

---

## 3. Link Wallet

- **POST** `/kyc/requests/{kycRequestId}/wallet` or `/api/kyc/requests/{id}/wallet`
- **Path:** `kycRequestId`
- **Request body:** `{ "walletAddress": "0x..." }`
- **Response (200):** success message, optional updated request
- **Errors:** 400 (invalid address), 403 (not approved), 409 (wallet already linked), 404

---

## 4. List Credentials by Wallet

- **GET** `/credentials?wallet={address}` or `/api/credentials?wallet=0x...`
- **Query:** `wallet`
- **Response (200):** array of credentials:
  - `credentialId`, `status`, `issuedAt`, `expiry`, `registeredOnChain`, `revoked`, etc.

---

## 5. Get Credential by ID

- **GET** `/credentials/{credentialId}` or `/api/credentials/{id}`
- **Response (200):** full credential:
  - `credentialId`, credential JSON, `signature`, `credentialHash`, `issuer`, `wallet`, `issuedAt`, `expiry`, `status`, `registeredOnChain`, `revoked`, `transactionHash`, `signedAt`, `registeredAt`, `revokedAt`, `revocationReason`, etc.

---

## 6. Issue Credential (Provider)

- **POST** `/credentials/issue` or `/api/credentials/issue`
- **Request body:** `{ "kycRequestId": "..." }` (and optionally wallet if not from request)
- **Response (201):** issued credential object (`credentialId`, `issuer`, `kycRequestId`, `subjectWallet`, `fullName`, `identityVerified`, `idType`, `issuedAt`, `expiry`, `status`, etc.)
- **Errors:** 404 (request not found), 403 (not approved), 400 (wallet not linked), 409 (duplicate)

---

## 7. Sign Credential (Provider)

- **POST** `/credentials/{credentialId}/sign` or `/api/credentials/{id}/sign`
- **Response (200):** `credentialHash`, `signature`, `signedAt`
- **Errors:** 404, 400 (invalid state), 500

---

## 8. Register On-Chain (Provider)

- **POST** `/credentials/{credentialId}/register` or `/api/credentials/{id}/register`
- **Response (200):** `transactionHash`, `registeredAt`, `registeredOnChain: true`
- **Errors:** 404, 409 (already registered), 502 (blockchain failure)

---

## 9. Revoke Credential (Provider)

- **POST** `/credentials/{credentialId}/revoke` or `/api/credentials/{id}/revoke`
- **Request body (optional):** `{ "reason": "..." }`
- **Response (200):** `revoked`, `revokedAt`, `revocationReason`, `revocationTxHash`
- **Errors:** 404, 400 (already revoked / not eligible), 500

---

## 10. Verify Credential (Verifier)

- **POST** `/credentials/verify` or `/api/credentials/verify`
- **Request body:** `{ "credential": { ... }, "signature": "0x..." }` or raw credential JSON + signature
- **Response (200):**
  - `credentialHash`, `signatureValid`, `registeredOnChain`, `revoked`, `expired`, `verificationStatus`, `message`
- **Errors:** 400 (missing payload, invalid), 500

---

## 11. Provider: List KYC Requests / Screening

- **GET** `/kyc/requests` or `/api/kyc/requests` (optional query: `status=pending`)
- **Response (200):** array of KYC requests
- **POST** `/kyc/requests/{kycRequestId}/screen` or `/api/kyc/requests/{id}/screen`
- **Request body (optional):** `{ "approved": true }` or `{ "approved": false, "reason": "..." }`
- **Response (200):** updated request (status, screening result)
- **Errors:** 404, 400 (already processed), 409

---

## 12. Provider: Summary / Stats (if available)

- **GET** `/api/stats` or `/kyc/stats` — total requests, pending, approved, rejected, issued, registered, revoked. If missing, derive from list endpoints.

---

## Error Response Shape (backend)

Backend returns a single message string:

```json
{
  "message": "Error description"
}
```

Examples: `"fullName, dateOfBirth, and address are required"`, `"Either SSN or Driver License Number must be provided"`, `"A pending KYC request already exists for this user"`, `"Failed to create KYC request"`.
