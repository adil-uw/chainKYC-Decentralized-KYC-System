# ChainKYC Frontend — API Contract (Backend-Alignment)

**Backend** lives in `backend/` (FastAPI). All paths below are implemented unless marked *not in backend*.

**Error body:** Backend returns `{"message": "..."}` for 400/404/409/500.

---

## KYC (`/api/kyc`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/kyc/requests` | query: `status?` (pending \| approved \| rejected) | 200: array of KYC requests |
| GET | `/api/kyc/requests/{kyc_request_id}` | — | 200: single KYC request (kycRequestId, fullName, status, etc.) |
| POST | `/api/kyc/submit` | `{ fullName, dateOfBirth, address, ssn?, driverLicenseNumber?, email?, phoneNumber? }` (camelCase) | 201: `{ message, kycRequestId, status }` |
| POST | `/api/kyc/{kyc_request_id}/screen` | (no body) | 200: screening result (status, reason?, message) |
| POST | `/api/kyc/{kyc_request_id}/link-wallet` | `{ walletAddress }` | 200: link result |

---

## Credentials (`/api/credentials`)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/credentials/issue/{kyc_request_id}` | (no body) | 200: `{ credentialId, kycRequestId, status, message }` |
| GET | `/api/credentials/by-wallet/{wallet_address}` | — | 200: `{ credentialId, credential, signature, message }`; `?format=package` for verify payload |
| GET | `/api/credentials/by-wallet/{wallet_address}/list` | — | 200: `{ walletAddress, credentials: [{ credentialId, status, issuedAt, expiry }] }` |
| GET | `/api/credentials/{credential_id}/status` | — | 200: `{ credentialId, credentialHash, registeredOnChain, revoked, expired, status }` |
| POST | `/api/credentials/{credential_id}/sign` | (no body) | 200: `{ credentialId, credentialHash, signature, message }` |
| POST | `/api/credentials/{credential_id}/register` | (no body) | 200: `{ credentialId, credentialHash, transactionHash, message }` |
| POST | `/api/credentials/{credential_id}/revoke` | `{ reason? }` | 200: revoke result |
| POST | `/api/credentials/verify` | `{ credential, signature }` | 200: `{ credentialHash, signatureValid, registeredOnChain, revoked, expired, verificationStatus, message }` |

---

## Health & Stats

- **GET** `/api/health` → `{ status: "ok", message: "Backend is running" }`
- **GET** `/api/stats` → `{ totalRequests, pending, approved, rejected, issuedCredentials, registeredCredentials, revokedCredentials }`

---

## CORS

Backend allows: localhost/127.0.0.1 on ports 3000, 3001, 3002, 5173.
