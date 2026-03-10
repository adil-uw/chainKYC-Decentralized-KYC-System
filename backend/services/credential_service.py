"""
Credential Service — Use Cases 4 (issue), 5 (hash/sign), 6 (register), 6A (retrieve by wallet).

Use Case 4: Create credential from approved, wallet-linked KYC request.
Use Case 5: Hash the credential, sign with KYC provider key, store hash and signature.
Use Case 6: Register credential hash on dKYCRegistry contract, store tx hash in MongoDB.
Use Case 6A: Retrieve issued credential by linked wallet address.
"""

import logging
import re
from datetime import datetime, timezone, timedelta

from bson import ObjectId
from database import get_database
from schemas.credential_schema import (
    CredentialIssueResponse,
    CredentialSignResponse,
    CredentialRegisterResponse,
    CredentialByWalletResponse,
    CredentialPayload,
)
from utils.credential_hash import credential_document_hash
from utils.credential_sign import sign_credential_hash
from services.blockchain_service import (
    is_registered_on_chain,
    register_credential_on_chain,
)

logger = logging.getLogger(__name__)


KYC_REQUESTS_COLLECTION = "kyc_requests"
CREDENTIALS_COLLECTION = "credentials"
ISSUER = "KYCProvider"
CREDENTIAL_VALIDITY_YEARS = 1

# Ethereum address validation for by-wallet lookup
_WALLET_ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")


class CredentialService:
    """Issues verifiable credentials from approved KYC records."""

    @staticmethod
    async def issue_credential(kyc_request_id: str) -> CredentialIssueResponse:
        """
        Issue a credential for an approved KYC request that has a linked wallet.

        Fetches the KYC record, checks status is approved and wallet is linked,
        builds the credential JSON, stores it in the credentials collection,
        and returns the response.

        Raises:
            ValueError("KYC request not found") when no KYC record exists.
            ValueError("Credential can only be issued for an approved KYC request with linked wallet")
                when status != "approved" or wallet is not linked.
        """
        db = get_database()
        kyc_coll = db[KYC_REQUESTS_COLLECTION]
        cred_coll = db[CREDENTIALS_COLLECTION]

        if not ObjectId.is_valid(kyc_request_id):
            raise ValueError("KYC request not found")
        oid = ObjectId(kyc_request_id)

        kyc_doc = await kyc_coll.find_one({"_id": oid})
        if not kyc_doc:
            raise ValueError("KYC request not found")

        if kyc_doc.get("status") != "approved":
            raise ValueError(
                "Credential can only be issued for an approved KYC request with linked wallet"
            )

        wallet_address = kyc_doc.get("walletAddress")
        if not wallet_address or not str(wallet_address).strip():
            raise ValueError(
                "Credential can only be issued for an approved KYC request with linked wallet"
            )

        # Unique credential id for this document (stored as _id per spec example)
        credential_id = "cred_" + str(ObjectId())
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(days=365 * CREDENTIAL_VALIDITY_YEARS)

        full_name = kyc_doc.get("fullName") or ""
        ssn = kyc_doc.get("ssn")
        driver_license = kyc_doc.get("driverLicenseNumber")

        # idType: which identity proof was used (prefer ssn if present)
        id_type = "ssn" if ssn else "driverLicense"

        cred_doc = {
            "_id": credential_id,
            "kycRequestId": kyc_request_id,
            "issuer": ISSUER,
            "subjectWallet": wallet_address,
            "fullName": full_name,
            "identityVerified": True,
            "idType": id_type,
            "issuedAt": now,
            "expiry": expiry,
            "status": "active",
        }

        await cred_coll.insert_one(cred_doc)

        return CredentialIssueResponse(
            credential_id=credential_id,
            kyc_request_id=kyc_request_id,
            status="active",
            message="Credential issued successfully",
        )

    # --- Use Case 5: Hash and Sign the Credential ---

    # Keys that form the signed credential payload (same as at issue time; exclude hash/signature/signedAt)
    _CREDENTIAL_HASH_KEYS = (
        "_id",
        "kycRequestId",
        "issuer",
        "subjectWallet",
        "fullName",
        "identityVerified",
        "idType",
        "issuedAt",
        "expiry",
        "status",
    )

    @classmethod
    async def sign_credential(cls, credential_id: str) -> CredentialSignResponse:
        """
        Hash the credential document and sign it with the KYC provider's private key.
        Stores credentialHash, signature, and signedAt on the credential record.

        Credential must exist and have status "active".
        KYC_PROVIDER_PRIVATE_KEY must be set in the environment.

        Raises:
            ValueError("Credential not found") when no credential with that id exists.
            ValueError("Credential is not eligible for signing") when status != "active".
            RuntimeError when signing fails (e.g. key not configured).
        """
        db = get_database()
        cred_coll = db[CREDENTIALS_COLLECTION]

        # Credential _id is a string (e.g. "cred_xxx")
        cred_doc = await cred_coll.find_one({"_id": credential_id})
        if not cred_doc:
            raise ValueError("Credential not found")

        if cred_doc.get("status") != "active":
            raise ValueError("Credential is not eligible for signing")

        # Build the payload that was issued (consistent format for deterministic hash)
        payload = {
            k: cred_doc[k]
            for k in cls._CREDENTIAL_HASH_KEYS
            if k in cred_doc
        }
        credential_hash = credential_document_hash(payload)

        signature = sign_credential_hash(credential_hash)
        if not signature:
            raise RuntimeError(
                "Failed to sign credential: KYC_PROVIDER_PRIVATE_KEY not set or invalid"
            )

        now = datetime.now(timezone.utc)
        await cred_coll.update_one(
            {"_id": credential_id},
            {
                "$set": {
                    "credentialHash": credential_hash,
                    "signature": signature,
                    "signedAt": now,
                }
            },
        )

        return CredentialSignResponse(
            credential_id=credential_id,
            credential_hash=credential_hash,
            signature=signature,
            message="Credential hashed and signed successfully",
        )

    # --- Use Case 6: Register Credential Hash On-Chain ---

    @classmethod
    async def register_credential_on_chain(cls, credential_id: str) -> CredentialRegisterResponse:
        """
        Register the credential's hash on the dKYCRegistry smart contract.
        Validates: credential exists, has credentialHash and signature, is active, not already registered.
        Optionally checks isRegistered on-chain before calling registerCredential.
        """
        db = get_database()
        cred_coll = db[CREDENTIALS_COLLECTION]

        cred_doc = await cred_coll.find_one({"_id": credential_id})
        if not cred_doc:
            logger.debug("Register: credential not found for id=%s", credential_id)
            raise ValueError("Credential not found")

        logger.info("Credential fetched: id=%s, status=%s", credential_id, cred_doc.get("status"))

        if cred_doc.get("onChainRegistered"):
            logger.debug("Register: already registered credentialId=%s", credential_id)
            raise ValueError("Credential is already registered on-chain")

        credential_hash = cred_doc.get("credentialHash")
        if not credential_hash:
            raise ValueError("Credential is not eligible for registration: missing credentialHash")
        if not cred_doc.get("signature"):
            raise ValueError("Credential is not eligible for registration: missing signature")
        if cred_doc.get("status") != "active":
            raise ValueError("Credential is not eligible for registration: must be active")

        # Check on-chain first to avoid duplicate registration (contract may revert)
        if is_registered_on_chain(credential_hash):
            logger.info("Credential hash already registered on-chain; skipping registerCredential")
            raise ValueError("Credential is already registered on-chain")

        expiry = cred_doc.get("expiry")
        if not expiry:
            raise ValueError("Credential has no expiry")
        if hasattr(expiry, "timestamp"):
            expiry_uint64 = int(expiry.timestamp())
        else:
            raise ValueError("Credential expiry must be a datetime")

        tx_hash = register_credential_on_chain(credential_hash, expiry_uint64)
        if not tx_hash:
            raise RuntimeError("Failed to register credential on-chain")

        now = datetime.now(timezone.utc)
        await cred_coll.update_one(
            {"_id": credential_id},
            {
                "$set": {
                    "onChainRegistered": True,
                    "transactionHash": tx_hash,
                    "registeredAt": now,
                }
            },
        )
        logger.info("DB update done: credentialId=%s, transactionHash=%s", credential_id, tx_hash)

        return CredentialRegisterResponse(
            credential_id=credential_id,
            credential_hash=credential_hash,
            transaction_hash=tx_hash,
            message="Credential registered on-chain successfully",
        )

    # --- Use Case 6A: Retrieve Issued Credential by Wallet ---

    @staticmethod
    def _datetime_to_iso(dt) -> str:
        """Serialize datetime to ISO string for API (e.g. 2026-03-07T22:00:00Z)."""
        if dt is None:
            return ""
        if hasattr(dt, "isoformat"):
            s = dt.isoformat()
            return s.replace("+00:00", "Z") if "+00:00" in s else s
        return str(dt)

    @classmethod
    async def get_credential_by_wallet(cls, wallet_address: str) -> CredentialByWalletResponse:
        """
        Retrieve the issued credential linked to the given wallet address.
        Wallet must be valid Ethereum format. Returns credential + signature for presentation.

        Raises:
            ValueError("Wallet address is invalid") when format is wrong.
            ValueError("No credential found for this wallet") when no credential exists.
        """
        raw = (wallet_address or "").strip()
        if not _WALLET_ADDRESS_PATTERN.match(raw):
            raise ValueError("Wallet address is invalid")

        db = get_database()
        cred_coll = db[CREDENTIALS_COLLECTION]

        # Match subjectWallet (exact or case-insensitive; Ethereum addresses are case-insensitive)
        doc = await cred_coll.find_one({"subjectWallet": raw})
        if not doc:
            doc = await cred_coll.find_one({"subjectWallet": raw.lower()})
        if not doc:
            raise ValueError("No credential found for this wallet")

        cred_id = doc.get("_id") or doc.get("credentialId", "")
        if isinstance(cred_id, bytes):
            cred_id = cred_id.hex()
        cred_id_str = str(cred_id)

        issued_at = doc.get("issuedAt")
        expiry = doc.get("expiry")
        credential_payload = CredentialPayload(
            credentialId=cred_id_str,
            issuer=doc.get("issuer", ""),
            subjectWallet=doc.get("subjectWallet", raw),
            identityVerified=bool(doc.get("identityVerified", True)),
            idType=doc.get("idType", ""),
            issuedAt=cls._datetime_to_iso(issued_at),
            expiry=cls._datetime_to_iso(expiry),
            status=doc.get("status", "active"),
        )
        signature = doc.get("signature") or ""

        return CredentialByWalletResponse(
            credentialId=cred_id_str,
            credential=credential_payload,
            signature=signature,
            message="Credential fetched successfully",
        )
