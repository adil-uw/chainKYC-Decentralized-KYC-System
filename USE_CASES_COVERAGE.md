# Use Cases Coverage (from Adil Usecases – blockchain proj)

This document maps **Use Cases 4–10** from the PDF to the current implementation (backend + frontend) and confirms parameters/endpoints match the spec.

---

## Use Case 4: Issue Verifiable Credential

| Spec (PDF) | Implementation | Status |
|------------|----------------|--------|
| **Endpoint** | `POST /api/credentials/issue/{kycRequestId}` | ✅ `backend/routers/credentials_router.py` |
| **Preconditions** | KYC approved, wallet linked | ✅ Checked in `credential_service.issue_credential()` |
| **Postconditions** | Credential JSON created and stored in DB | ✅ Insert into `credentials` collection |
| **Response** | credentialId, kycRequestId, status, message | ✅ `CredentialIssueResponse` |
| **Credential fields stored** | credentialId, issuer, kycRequestId, subjectWallet, fullName, identityVerified, idType, issuedAt, expiry, status | ✅ All in `cred_doc` |
| **Frontend** | Issue Credential page → select approved KYC → Issue | ✅ `frontend/src/pages/IssueCredential.jsx` → `POST /api/credentials/issue/{id}` |

**Parameters:** Path `kycRequestId` only; no body. ✅

---

## Use Case 5: Hash and Sign the Credential

| Spec (PDF) | Implementation | Status |
|------------|----------------|--------|
| **Endpoint** | `POST /api/credentials/{credentialId}/sign` | ✅ `credentials_router.py` |
| **Preconditions** | Credential exists, active, KYC provider key available | ✅ Checked in `sign_credential()` |
| **Hash** | SHA-256 of canonical JSON | ✅ `utils/credential_hash.py` – canonical JSON + SHA-256 |
| **Sign** | KYC provider private key (Ethereum ECDSA) | ✅ `utils/credential_sign.py` – `sign_credential_hash()` |
| **Stored** | credentialHash, signature, signedAt in MongoDB | ✅ `credential_service.sign_credential()` |
| **Response** | credentialId, credentialHash, signature, message | ✅ `CredentialSignResponse` |
| **Frontend** | Hash & Sign page → POST sign → show hash/signature, link to Register | ✅ `SignCredential.jsx` → `POST /api/credentials/{id}/sign` |

**Parameters:** Path `credentialId` only; no body. ✅

---

## Use Case 6: Register Credential Hash On-Chain

| Spec (PDF) | Implementation | Status |
|------------|----------------|--------|
| **Endpoint** | `POST /api/credentials/{credentialId}/register` | ✅ `credentials_router.py` |
| **Preconditions** | Credential hashed & signed, issuer key, contract configured | ✅ Checked in `register_credential_on_chain()` |
| **Contract** | registerCredential(bytes32 credentialHash, uint64 expiry) | ✅ `blockchain_service.register_credential_on_chain()` |
| **Stored** | transactionHash, onChainRegistered, registeredAt in MongoDB | ✅ After successful tx |
| **Response** | credentialId, credentialHash, transactionHash, message | ✅ `CredentialRegisterResponse` |
| **Frontend** | Register On-Chain page → POST register → show tx hash | ✅ `RegisterOnChain.jsx` → `POST /api/credentials/{id}/register` |

**Parameters:** Path `credentialId` only. ✅

---

## Use Case 6A: Retrieve Issued Credential (by wallet)

| Spec (PDF) | Implementation | Status |
|------------|----------------|--------|
| **Endpoint** | `GET /api/credentials/by-wallet/{walletAddress}` | ✅ `credentials_router.py` |
| **Response** | credentialId, credential { ... }, signature, message | ✅ `CredentialByWalletResponse` + `CredentialPayload` |
| **Frontend** | My Credentials / Connect Wallet flow; verify package | ✅ `getCredentialByWallet()` in api/credentials.js |

**Parameters:** Path `walletAddress`. Optional `?format=package` for verify payload. ✅

---

## Use Case 7: Verify Credential

| Spec (PDF) | Implementation | Status |
|------------|----------------|--------|
| **Endpoint** | `POST /api/credentials/verify` | ✅ `credentials_router.py` |
| **Body** | credential (JSON), signature | ✅ `CredentialVerifyRequest` |
| **Logic** | Recompute hash → verify issuer signature → getCredentialStatus on-chain | ✅ `credential_service.verify_credential()` |
| **Response** | credentialHash, signatureValid, registeredOnChain, revoked, expired, verificationStatus, message | ✅ `CredentialVerifyResponse` |
| **Contract** | getCredentialStatus(bytes32 credentialHash) | ✅ `blockchain_service.get_credential_status()` |
| **Frontend** | Verify Credential page → paste credential + signature → POST verify | ✅ `VerifyCredential.jsx` → `POST /api/credentials/verify` |

**Parameters:** Body `{ credential, signature }`. ✅

---

## Use Case 8: Revoke Credential

| Spec (PDF) | Implementation | Status |
|------------|----------------|--------|
| **Endpoint** | `POST /api/credentials/{credentialId}/revoke` | ✅ `credentials_router.py` |
| **Body** | Optional `{ reason }` | ✅ `CredentialRevokeRequest` |
| **Contract** | revokeCredential(bytes32 credentialHash) | ✅ `blockchain_service.revoke_credential_on_chain()` |
| **Stored** | status=revoked, revoked=true, revocationReason, revokedAt, revocationTxHash | ✅ In `revoke_credential()` |
| **Response** | credentialId, credentialHash, transactionHash, status, message | ✅ `CredentialRevokeResponse` |
| **Frontend** | Revoke Credential page with optional reason | ✅ `RevokeCredential.jsx` → `POST /api/credentials/{id}/revoke` |

**Parameters:** Path `credentialId`; optional body `reason`. ✅

---

## Use Case 9: Check Credential Status

| Spec (PDF) | Implementation | Status |
|------------|----------------|--------|
| **Endpoint** | `GET /api/credentials/{credentialId}/status` | ✅ `credentials_router.py` |
| **Logic** | DB + on-chain (getCredentialStatus) | ✅ `get_credential_status()` |
| **Response** | credentialId, credentialHash, registeredOnChain, revoked, expired, status | ✅ `CredentialStatusResponse` |
| **Frontend** | Credential Details / Sign / Register pages use this | ✅ `getCredentialStatus()` in api/credentials.js |

**Parameters:** Path `credentialId`. ✅

---

## Use Case 10: List Credentials for a User

| Spec (PDF) | Implementation | Status |
|------------|----------------|--------|
| **Endpoint** | `GET /api/credentials/by-wallet/{walletAddress}` (list) | ✅ PDF says “list”; we use `GET /api/credentials/by-wallet/{walletAddress}/list` |
| **Response** | walletAddress, credentials: [{ credentialId, status, issuedAt, expiry }] | ✅ `CredentialsByWalletListResponse` |
| **Frontend** | My Credentials page lists by connected wallet | ✅ `MyCredentials.jsx` → `listCredentialsByWallet()` |

**Parameters:** Path `walletAddress`. ✅

---

## Summary

| Use case | Backend | Frontend | Parameters match |
|----------|---------|----------|------------------|
| 4 – Issue credential | ✅ | ✅ | ✅ |
| 5 – Hash & sign | ✅ | ✅ | ✅ |
| 6 – Register on-chain | ✅ | ✅ | ✅ |
| 6A – Retrieve by wallet | ✅ | ✅ | ✅ |
| 7 – Verify credential | ✅ | ✅ | ✅ |
| 8 – Revoke credential | ✅ | ✅ | ✅ |
| 9 – Check status | ✅ | ✅ | ✅ |
| 10 – List by wallet | ✅ | ✅ | ✅ |

All use cases 4–10 are implemented. The provider flow (4 → 5 → 6) is: **Provider Dashboard** → **Issue Credential** → after issue, link to **Hash & Sign** → then link to **Register On-Chain**. Ensure the dashboard and navigation make this pipeline obvious (see below).

---

## Making UC 4, 5, 6 More Visible

- **UC4:** Provider Dashboard → “Issue Credential” → `/provider/issue`.
- **UC5:** After issuing, “Hash & Sign” → `/provider/sign/:credentialId`. Or from dashboard, “Sign credential” with credential ID input.
- **UC6:** After signing, “Register On-Chain” → `/provider/register/:credentialId`. Or from dashboard, “Register on-chain” with credential ID input.

Adding a **Credential pipeline** card on the Provider Dashboard with direct links and an optional “Credential ID” input for Sign/Register makes UC 4, 5, and 6 clearly discoverable.
