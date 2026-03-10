"""
KYC API schemas.

- Use Case 1: KYCSubmitRequest, KYCSubmitResponse (POST /api/kyc/submit).
- Use Case 2: KYCScreenResponse (POST /api/kyc/{kycRequestId}/screen).
- Use Case 3: LinkWalletRequest, LinkWalletResponse (POST /api/kyc/{kycRequestId}/link-wallet).
Uses camelCase in JSON to match the API spec.
"""

import re
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

# Ethereum address: 0x followed by exactly 40 hexadecimal characters
ETH_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")


class KYCSubmitRequest(BaseModel):
    """
    Request body for submitting a KYC request.

    Required: fullName, dateOfBirth, address.
    At least one identity proof is required: ssn and/or driverLicenseNumber.
    Optional: email, phoneNumber.
    """

    full_name: str = Field(..., alias="fullName", description="User's full legal name")
    date_of_birth: str = Field(..., alias="dateOfBirth", description="User's date of birth")
    address: str = Field(..., alias="address", description="User's residential address")
    ssn: Optional[str] = Field(None, alias="ssn", description="Social Security Number")
    driver_license_number: Optional[str] = Field(
        None, alias="driverLicenseNumber", description="Driver license number"
    )
    email: Optional[str] = Field(None, alias="email")
    phone_number: Optional[str] = Field(None, alias="phoneNumber")

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def at_least_one_identity_proof(self):
        """
        Business rule: at least one of SSN or Driver License must be provided.
        Pydantic will return 422 Unprocessable Entity with this error message;
        the router can map it to 400 if needed per spec.
        """
        if not self.ssn and not self.driver_license_number:
            raise ValueError("Either SSN or Driver License Number must be provided")
        return self


class KYCSubmitResponse(BaseModel):
    """Success response for POST /api/kyc/submit (201 Created)."""

    message: str = Field(..., description="Success message")
    kyc_request_id: str = Field(..., alias="kycRequestId", description="Unique ID for this KYC request")
    status: str = Field(..., description="Current status, e.g. pending")

    model_config = {"populate_by_name": True}


# --- Use Case 2: Perform Off-Chain KYC Screening ---


class KYCScreenResponse(BaseModel):
    """
    Response for POST /api/kyc/{kycRequestId}/screen.
    Includes optional reason when status is "rejected".
    """

    kyc_request_id: str = Field(..., alias="kycRequestId")
    status: str = Field(..., description="approved | rejected")
    message: str = Field(..., description="Screening result message")
    reason: Optional[str] = Field(None, description="Rejection reason when status is rejected")

    model_config = {"populate_by_name": True}


# --- Use Case 3: Link Wallet Address to Approved User ---


class LinkWalletRequest(BaseModel):
    """Request body for POST /api/kyc/{kycRequestId}/link-wallet."""

    wallet_address: str = Field(..., alias="walletAddress", description="Ethereum wallet address (0x + 40 hex chars)")

    model_config = {"populate_by_name": True}

    @field_validator("wallet_address")
    @classmethod
    def validate_ethereum_address(cls, v: str) -> str:
        """Ensure wallet address matches Ethereum format: 0x + 40 hex characters."""
        if not v or not v.strip():
            raise ValueError("Wallet address is required")
        normalized = v.strip()
        if not ETH_ADDRESS_PATTERN.match(normalized):
            raise ValueError("Wallet address is invalid")
        return normalized


class LinkWalletResponse(BaseModel):
    """Success response for POST /api/kyc/{kycRequestId}/link-wallet."""

    kyc_request_id: str = Field(..., alias="kycRequestId")
    status: str = Field(..., description="approved")
    wallet_address: str = Field(..., alias="walletAddress")
    message: str = Field(..., description="Wallet linked successfully")

    model_config = {"populate_by_name": True}
