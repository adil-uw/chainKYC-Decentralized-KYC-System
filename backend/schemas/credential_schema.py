"""
Credential API schemas — Use Case 4: Issue Verifiable Credential.

Response for POST /api/credentials/issue/{kycRequestId}.
"""

from pydantic import BaseModel, Field


class CredentialIssueResponse(BaseModel):
    """Success response when a credential is issued."""

    credential_id: str = Field(..., alias="credentialId")
    kyc_request_id: str = Field(..., alias="kycRequestId")
    status: str = Field(..., description="active")
    message: str = Field(..., description="Credential issued successfully")

    model_config = {"populate_by_name": True}
