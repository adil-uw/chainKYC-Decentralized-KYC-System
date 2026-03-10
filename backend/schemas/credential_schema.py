"""
Credential API schemas — Use Case 4 (issue), 5 (sign), 6 (register), 6A (retrieve by wallet).

Responses for credential issue, sign, register-on-chain, and retrieve-by-wallet endpoints.
"""

import re

from pydantic import BaseModel, Field

# Ethereum address: 0x + 40 hex chars (for validation)
ETH_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")


class CredentialIssueResponse(BaseModel):
    """Success response when a credential is issued."""

    credential_id: str = Field(..., alias="credentialId")
    kyc_request_id: str = Field(..., alias="kycRequestId")
    status: str = Field(..., description="active")
    message: str = Field(..., description="Credential issued successfully")

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
