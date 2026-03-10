"""
KYC Router — Use Case 1: Submit KYC Data Off-Chain.

Thin layer: parses request, calls KYCService, returns response.
All validation and business rules are in the service and schemas.
Error responses use body {"message": "..."} as per API spec.
"""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from schemas.kyc_schema import KYCSubmitRequest, KYCSubmitResponse
from services.kyc_service import KYCService

router = APIRouter(prefix="/api/kyc", tags=["kyc"])


def _message_response(status_code: int, message: str) -> JSONResponse:
    """Return JSON body { "message": "..." } as required by the API spec."""
    return JSONResponse(status_code=status_code, content={"message": message})


@router.post(
    "/submit",
    status_code=201,
    responses={
        400: {"description": "Missing required fields or identity proof"},
        409: {"description": "Duplicate pending KYC request"},
        500: {"description": "Failed to create KYC request"},
    },
)
async def submit_kyc(data: KYCSubmitRequest):
    """
    Submit KYC data off-chain. Data is stored in MongoDB with status "pending".
    No blockchain interaction in this use case.
    """
    try:
        result = await KYCService.submit_kyc_request(data)
        # Serialize with camelCase (kycRequestId) for the API spec
        return JSONResponse(
            status_code=201,
            content=result.model_dump(by_alias=True),
        )
    except ValueError as e:
        msg = str(e)
        if "pending KYC request already exists" in msg:
            return _message_response(409, msg)
        # e.g. "Either SSN or Driver License Number must be provided"
        return _message_response(400, msg)
    except Exception as e:
        # Log the real error so we can fix it (e.g. MongoDB connection, env not loaded)
        logger.exception("KYC submit failed: %s", e)
        return _message_response(500, "Failed to create KYC request")
