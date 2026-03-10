"""
Schemas for Use Case 1: Submit KYC Data Off-Chain.

Defines the shape of the request body and the success response
for POST /api/kyc/submit. Uses camelCase in JSON to match the API spec.
"""

from typing import Optional

from pydantic import BaseModel, Field, model_validator


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
