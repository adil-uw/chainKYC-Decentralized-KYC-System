"""
Credentials Router — Use Case 4: Issue Verifiable Credential.

Thin layer: calls CredentialService, returns response.
Error responses use body {"message": "..."} as per API spec.
"""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas.credential_schema import CredentialIssueResponse
from services.credential_service import CredentialService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/credentials", tags=["credentials"])


def _message_response(status_code: int, message: str) -> JSONResponse:
    """Return JSON body { "message": "..." } as required by the API spec."""
    return JSONResponse(status_code=status_code, content={"message": message})


@router.post(
    "/issue/{kyc_request_id}",
    status_code=200,
    responses={
        404: {"description": "KYC request not found"},
        409: {"description": "Not approved or wallet not linked"},
        500: {"description": "Failed to issue credential"},
    },
)
async def issue_credential(kyc_request_id: str):
    """
    Issue a verifiable credential for an approved KYC request with linked wallet.
    Credential is stored in the database (ready for hashing and on-chain registration).
    """
    try:
        result = await CredentialService.issue_credential(kyc_request_id)
        return JSONResponse(
            status_code=200,
            content=result.model_dump(by_alias=True),
        )
    except ValueError as e:
        msg = str(e)
        if msg == "KYC request not found":
            return _message_response(404, msg)
        if "Credential can only be issued" in msg:
            return _message_response(409, "Credential can only be issued for an approved KYC request with linked wallet")
        return _message_response(400, msg)
    except Exception as e:
        logger.exception("Credential issue failed: %s", e)
        return _message_response(500, "Failed to issue credential")

