"""
Credential API schemas — Use Case 4 (issue), 5 (sign), 6 (register), 6A (retrieve by wallet), 7 (verify).

Responses for credential issue, sign, register-on-chain, retrieve-by-wallet, and verify endpoints.
"""

import re

from pydantic import BaseModel, Field

# Ethereum address: 0x + 40 hex chars (for validation)
ETH_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")


class CredentialIssueResponse(BaseModel):
    """Success response when a credential is issued (Use Case 4). Includes display fields for frontend."""

    credential_id: str = Field(..., alias="credentialId")
    kyc_request_id: str = Field(..., alias="kycRequestId")
    status: str = Field(..., description="active")
    message: str = Field(..., description="Credential issued successfully")
    issuer: str | None = Field(None, description="KYCProvider")
    subject_wallet: str | None = Field(None, alias="subjectWallet")
    issued_at: str | None = Field(None, alias="issuedAt")
    expiry: str | None = Field(None)

    model_config = {"populate_by_name": True}


class CredentialSignResponse(BaseModel):
    """Success response when a credential is hashed and signed (Use Case 5)."""

    credential_id: str = Field(..., alias="credentialId")
    credential_hash: str = Field(..., alias="credentialHash")
    signature: str = Field(..., alias="signature")
    message: str = Field(..., description="Credential hashed and signed successfully")

    model_config = {"populate_by_name": True}


class CredentialRegisterResponse(BaseModel):
    """Success response when credential hash is registered on-chain (Use Case 6)."""

    credential_id: str = Field(..., alias="credentialId")
    credential_hash: str = Field(..., alias="credentialHash")
    transaction_hash: str = Field(..., alias="transactionHash")
    message: str = Field(..., description="Credential registered on-chain successfully")

    model_config = {"populate_by_name": True}


# --- Use Case 6A: Retrieve Issued Credential by Wallet ---


class CredentialPayload(BaseModel):
    """Nested credential object in by-wallet response (safe to return to frontend)."""

    credential_id: str = Field(..., alias="credentialId")
    issuer: str = Field(...)
    subject_wallet: str = Field(..., alias="subjectWallet")
    identity_verified: bool = Field(..., alias="identityVerified")
    id_type: str = Field(..., alias="idType")
    issued_at: str = Field(..., alias="issuedAt")
    expiry: str = Field(..., alias="expiry")
    status: str = Field(...)

    model_config = {"populate_by_name": True}


class CredentialByWalletResponse(BaseModel):
    """Success response for GET /api/credentials/by-wallet/{walletAddress} (Use Case 6A)."""

    credential_id: str = Field(..., alias="credentialId")
    credential: CredentialPayload = Field(...)
    signature: str = Field(...)
    message: str = Field(..., description="Credential fetched successfully")

    model_config = {"populate_by_name": True}


# --- Use Case 7: Verify Credential ---


class CredentialVerifyRequest(BaseModel):
    """
    Request body for POST /api/credentials/verify (Use Case 7).
    Credential is accepted as a dict so DB exports (e.g. MongoDB $date, extra fields
    like fullName, kycRequestId) are accepted. Backend normalizes and uses the 6 hash fields.
    """

    credential: dict = Field(..., description="Credential object (from DB or by-wallet); may include $date, fullName, etc.")
    signature: str = Field(..., description="Issuer signature attached to the credential")

    model_config = {"populate_by_name": True, "extra": "ignore"}


class CredentialVerifyResponse(BaseModel):
    """Response for POST /api/credentials/verify — valid or invalid (Use Case 7)."""

    credential_hash: str = Field(..., alias="credentialHash")
    signature_valid: bool = Field(..., alias="signatureValid")
    registered_on_chain: bool = Field(..., alias="registeredOnChain")
    revoked: bool = Field(...)
    expired: bool = Field(...)
    verification_status: str = Field(..., alias="verificationStatus")  # "valid" | "invalid"
    message: str = Field(...)

    model_config = {"populate_by_name": True}


# --- Use Case 8: Revoke Credential ---


class CredentialRevokeRequest(BaseModel):
    """Optional body for POST /api/credentials/{credentialId}/revoke (Use Case 8)."""

    reason: str | None = Field(None, description="Reason for revocation (stored in MongoDB; contract uses reason code)")

    model_config = {"populate_by_name": True, "extra": "ignore"}


class CredentialRevokeResponse(BaseModel):
    """Response for POST /api/credentials/{credentialId}/revoke (Use Case 8)."""

    credential_id: str = Field(..., alias="credentialId")
    credential_hash: str = Field(..., alias="credentialHash")
    transaction_hash: str = Field(..., alias="transactionHash")
    status: str = Field(..., description="revoked")
    message: str = Field(..., description="Credential revoked successfully")

    model_config = {"populate_by_name": True}


# --- Use Case 9: Check Credential Status ---


class CredentialStatusResponse(BaseModel):
    """Response for GET /api/credentials/{credentialId}/status (Use Case 9)."""

    credential_id: str = Field(..., alias="credentialId")
    credential_hash: str = Field(..., alias="credentialHash")
    registered_on_chain: bool = Field(..., alias="registeredOnChain")
    revoked: bool = Field(...)
    expired: bool = Field(...)
    status: str = Field(..., description="active | revoked from DB and/or chain")

    model_config = {"populate_by_name": True}


# --- Use Case 10: List Credentials for a User ---


class CredentialSummaryItem(BaseModel):
    """One credential in the list for GET /api/credentials/by-wallet/{walletAddress}/list (Use Case 10)."""

    credential_id: str = Field(..., alias="credentialId")
    status: str = Field(...)
    issued_at: str = Field(..., alias="issuedAt")
    expiry: str = Field(..., alias="expiry")

    model_config = {"populate_by_name": True}


class CredentialsByWalletListResponse(BaseModel):
    """Response for GET /api/credentials/by-wallet/{walletAddress}/list (Use Case 10)."""

    wallet_address: str = Field(..., alias="walletAddress")
    credentials: list[CredentialSummaryItem] = Field(...)

    model_config = {"populate_by_name": True}
