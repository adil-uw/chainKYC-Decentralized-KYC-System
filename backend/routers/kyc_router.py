"""
KYC Router — Use Cases 1 (submit), 2 (screen), 3 (link wallet).

Thin layer: parses request, calls KYCService, returns response.
Error responses use body {"message": "..."} as per API spec.
"""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from schemas.kyc_schema import (
    KYCSubmitRequest,
    KYCSubmitResponse,
    KYCScreenResponse,
    LinkWalletRequest,
    LinkWalletResponse,
)
from services.kyc_service import KYCService

router = APIRouter(prefix="/api/kyc", tags=["kyc"])


def _message_response(status_code: int, message: str) -> JSONResponse:
    """Return JSON body { "message": "..." } as required by the API spec."""
    return JSONResponse(status_code=status_code, content={"message": message})


# --- GET list and GET one (register before /{kyc_request_id}/... so "requests" is not captured) ---


@router.get(
    "/requests",
    status_code=200,
    responses={500: {"description": "Failed to list KYC requests"}},
)
async def list_kyc_requests(status: str | None = None):
    """List KYC requests, optionally filtered by status (pending, approved, rejected)."""
    try:
        items = await KYCService.list_kyc_requests(status=status)
        return JSONResponse(status_code=200, content=items)
    except Exception as e:
        logger.exception("List KYC requests failed: %s", e)
        return _message_response(500, "Failed to list KYC requests")


@router.get(
    "/requests/{kyc_request_id}",
    status_code=200,
    responses={404: {"description": "KYC request not found"}},
)
async def get_kyc_request(kyc_request_id: str):
    """Get a single KYC request by id (for status page and screening)."""
    try:
        data = await KYCService.get_kyc_request(kyc_request_id)
        return JSONResponse(status_code=200, content=data)
    except ValueError as e:
        if str(e) == "KYC request not found":
            return _message_response(404, str(e))
        return _message_response(400, str(e))
    except Exception as e:
        logger.exception("Get KYC request failed: %s", e)
        return _message_response(500, "Failed to get KYC request")


@router.post(
    "/submit",
    status_code=201,
    responses={
        400: {"description": "Missing required fields or identity proof"},
        409: {"description": "Duplicate pending request, or SSN/driver license already used"},
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
        if "SSN is already associated" in msg or "Driver license number is already associated" in msg:
            return _message_response(409, msg)
        # e.g. "Either SSN or Driver License Number must be provided"
        return _message_response(400, msg)
    except Exception as e:
        # Log the real error so we can fix it (e.g. MongoDB connection, env not loaded)
        logger.exception("KYC submit failed: %s", e)
        return _message_response(500, "Failed to create KYC request")


# --- Use Case 2: Perform Off-Chain KYC Screening ---


@router.post(
    "/{kyc_request_id}/screen",
    status_code=200,
    responses={
        404: {"description": "KYC request not found"},
        409: {"description": "KYC request already processed"},
    },
)
async def screen_kyc(kyc_request_id: str):
    """
    Screen a pending KYC request against the blacklist.
    Updates status to approved or rejected and returns the result.
    """
    try:
        result = await KYCService.screen_kyc_request(kyc_request_id)
        return JSONResponse(
            status_code=200,
            content=result.model_dump(by_alias=True, exclude_none=True),
        )
    except ValueError as e:
        msg = str(e)
        if msg == "KYC request not found":
            return _message_response(404, msg)
        if msg == "KYC request already processed":
            return _message_response(409, msg)
        return _message_response(400, msg)
    except Exception as e:
        logger.exception("KYC screen failed: %s", e)
        return _message_response(500, "Failed to screen KYC request")


# --- Use Case 3: Link Wallet Address to Approved User ---


@router.post(
    "/{kyc_request_id}/link-wallet",
    status_code=200,
    responses={
        404: {"description": "KYC request not found"},
        400: {"description": "Wallet address is invalid"},
        409: {"description": "Not approved, or wallet already linked to another request"},
        500: {"description": "Failed to link wallet"},
    },
)
async def link_wallet(kyc_request_id: str, data: LinkWalletRequest):
    """
    Link a wallet address to an approved KYC request.
    Request body must include valid Ethereum address (0x + 40 hex chars).
    """
    try:
        result = await KYCService.link_wallet(kyc_request_id, data)
        return JSONResponse(
            status_code=200,
            content=result.model_dump(by_alias=True),
        )
    except ValueError as e:
        msg = str(e)
        if msg == "KYC request not found":
            return _message_response(404, msg)
        if msg == "Wallet can only be linked to an approved KYC request":
            return _message_response(409, msg)
        if "Wallet address is already linked" in msg:
            return _message_response(409, msg)
        return _message_response(400, msg)
    except Exception as e:
        logger.exception("KYC link-wallet failed: %s", e)
        return _message_response(500, "Failed to link wallet")
