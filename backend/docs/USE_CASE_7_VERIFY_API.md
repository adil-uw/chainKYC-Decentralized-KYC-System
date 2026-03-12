# Use Case 7: Verify Credential — API

**Endpoint:** `POST /api/credentials/verify`  
**Purpose:** Verifier (e.g. bank) verifies a credential presented by a user. Backend checks issuer signature off-chain and credential status on-chain (registered, not revoked, not expired).

## Request

| Field        | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| credential  | object | Yes      | Full credential JSON           |
| signature   | string | Yes      | Issuer signature (0x-prefixed) |

### Request example

```json
{
  "credential": {
    "credentialId": "cred_001",
    "issuer": "KYCProvider",
    "subjectWallet": "0x7A3f2C9D7bF0a1E5F3cD8E21C34B0D6aF9E12C4A",
    "identityVerified": true,
    "idType": "ssn",
    "issuedAt": "2026-03-07T22:00:00Z",
    "expiry": "2027-03-07T22:00:00Z",
    "status": "active"
  },
  "signature": "0x789xyz456aaa"
}
```

## Response (success — valid)

```json
{
  "credentialHash": "0xabc123def456",
  "signatureValid": true,
  "registeredOnChain": true,
  "revoked": false,
  "expired": false,
  "verificationStatus": "valid",
  "message": "Credential verified successfully"
}
```

## Response (success — invalid)

```json
{
  "credentialHash": "0xabc123def456",
  "signatureValid": false,
  "registeredOnChain": false,
  "revoked": false,
  "expired": false,
  "verificationStatus": "invalid",
  "message": "Credential verification failed"
}
```

## Error responses

- **400** — `{ "message": "Credential or signature is missing" }`
- **500** — `{ "message": "Failed to verify credential" }`

## Verification rules

The credential is **valid** only if:

1. Issuer signature is valid  
2. Credential hash is registered on-chain  
3. Credential is not revoked  
4. Credential is not expired  

Use the response JSON (`credentialHash`, `signatureValid`, `registeredOnChain`, `revoked`, `expired`, `verificationStatus`, `message`) to record or later re-check the verification result for the user.
