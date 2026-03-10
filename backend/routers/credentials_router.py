"""
Credentials Router — Use Cases 4 (issue), 5 (hash/sign), 6 (register), 6A (retrieve by wallet).

Thin layer: calls CredentialService, returns response.
Error responses use body {"message": "..."} as per API spec.
"""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas.credential_schema import (
    CredentialIssueResponse,
    CredentialSignResponse,
    CredentialRegisterResponse,
    CredentialByWalletResponse,
)
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


# --- Use Case 6A: Retrieve Issued Credential by Wallet ---
# (Register this before /{credential_id}/... so "by-wallet" is not captured as credential_id)


@router.get(
    "/by-wallet/{wallet_address}",
    status_code=200,
    responses={
        404: {"description": "No credential found for this wallet"},
        400: {"description": "Wallet address is invalid"},
    },
)
async def get_credential_by_wallet(wallet_address: str):
    """
    Retrieve the issued credential for the given linked wallet address.
    Returns credential and signature so the user can present it to a verifier.
    """
    try:
        result = await CredentialService.get_credential_by_wallet(wallet_address)
        return JSONResponse(
            status_code=200,
            content=result.model_dump(by_alias=True),
        )
    except ValueError as e:
        msg = str(e)
        if msg == "Wallet address is invalid":
            return _message_response(400, msg)
        if msg == "No credential found for this wallet":
            return _message_response(404, msg)
        return _message_response(400, msg)


# --- Use Case 5: Hash and Sign the Credential ---


@router.post(
    "/{credential_id}/sign",
    status_code=200,
    responses={
        404: {"description": "Credential not found"},
        409: {"description": "Credential is not eligible for signing"},
        500: {"description": "Failed to hash and sign credential"},
    },
)
async def sign_credential(credential_id: str):
    """
    Hash the credential and sign it with the KYC provider's private key.
    Stores credentialHash, signature, and signedAt on the credential.
    """
    try:
        result = await CredentialService.sign_credential(credential_id)
        return JSONResponse(
            status_code=200,
            content=result.model_dump(by_alias=True),
        )
    except ValueError as e:
        msg = str(e)
        if msg == "Credential not found":
            return _message_response(404, msg)
        if "not eligible for signing" in msg:
            return _message_response(409, msg)
        return _message_response(400, msg)
    except RuntimeError as e:
        logger.exception("Credential sign failed: %s", e)
        return _message_response(500, "Failed to hash and sign credential")
    except Exception as e:
        logger.exception("Credential sign failed: %s", e)
        return _message_response(500, "Failed to hash and sign credential")


# --- Use Case 6: Register Credential Hash On-Chain ---


@router.post(
    "/{credential_id}/register",
    status_code=200,
    responses={
        404: {"description": "Credential not found"},
        409: {"description": "Already registered or not eligible for registration"},
        500: {"description": "Failed to register credential on-chain"},
    },
)
async def register_credential(credential_id: str):
    """
    Register the credential hash on the dKYCRegistry smart contract.
    Credential must exist, be active, have credentialHash and signature, and not already registered.
    """
    try:
        result = await CredentialService.register_credential_on_chain(credential_id)
        return JSONResponse(
            status_code=200,
            content=result.model_dump(by_alias=True),
        )
    except ValueError as e:
        msg = str(e)
        if msg == "Credential not found":
            return _message_response(404, msg)
        if "already registered on-chain" in msg:
            return _message_response(409, msg)
        if "not eligible for registration" in msg:
            return _message_response(409, msg)
        return _message_response(400, msg)
    except RuntimeError as e:
        logger.exception("Credential register failed: %s", e)
        return _message_response(500, "Failed to register credential on-chain")
    except Exception as e:
        logger.exception("Credential register failed: %s", e)
        return _message_response(500, "Failed to register credential on-chain")

