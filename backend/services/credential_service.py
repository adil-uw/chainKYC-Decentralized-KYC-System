"""
Credential Service — Use Cases 4 (issue), 5 (hash/sign), 6 (register), 6A (retrieve by wallet), 7 (verify).

Use Case 4: Create credential from approved, wallet-linked KYC request.
Use Case 5: Hash the credential, sign with KYC provider key, store hash and signature.
Use Case 6: Register credential hash on dKYCRegistry contract, store tx hash in MongoDB.
Use Case 6A: Retrieve issued credential by linked wallet address.
Use Case 7: Verify credential (issuer signature off-chain + status on-chain).
Use Case 8: Revoke credential on-chain and in MongoDB.
"""

import logging
import os
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
    CredentialVerifyResponse,
    CredentialRevokeResponse,
    CredentialStatusResponse,
    CredentialSummaryItem,
    CredentialsByWalletListResponse,
)
from utils.credential_hash import credential_document_hash
from utils.credential_sign import sign_credential_hash, verify_credential_signature
from services.blockchain_service import (
    is_registered_on_chain,
    register_credential_on_chain,
    get_credential_status,
    revoke_credential_on_chain,
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

    # Fields included in the credential hash (issuedAt/expiry excluded to avoid date-format mismatch).
    # Expiry is enforced on-chain; verifier recomputes this hash from the presented credential.
    _CREDENTIAL_HASH_KEYS = (
        "credentialId",
        "issuer",
        "subjectWallet",
        "identityVerified",
        "idType",
        "status",
    )

    @classmethod
    async def sign_credential(cls, credential_id: str) -> CredentialSignResponse:
        """
        Hash the credential document and sign it with the KYC provider's private key.
        Stores credentialHash, signature, and signedAt on the credential record.
        Hash is over the public credential only (same shape as 6A/verify).

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

        # Build hash payload (no dates — expiry enforced on-chain; avoids date-format issues)
        payload = {
            "credentialId": str(cred_doc.get("_id", "")),
            "issuer": cred_doc.get("issuer", ""),
            "subjectWallet": cred_doc.get("subjectWallet", ""),
            "identityVerified": bool(cred_doc.get("identityVerified", True)),
            "idType": cred_doc.get("idType", ""),
            "status": cred_doc.get("status", "active"),
        }
        credential_hash = credential_document_hash(payload)

        signature = sign_credential_hash(credential_hash)
        if not signature:
            raise RuntimeError(
                "Failed to sign credential: KYC_PROVIDER_PRIVATE_KEY not set or invalid"
            )

        now = datetime.now(timezone.utc)
        old_hash = cred_doc.get("credentialHash")
        update_doc = {
            "$set": {
                "credentialHash": credential_hash,
                "signature": signature,
                "signedAt": now,
            }
        }
        # If hash changed (e.g. re-signed with new payload format), clear on-chain state
        # so the credential can be re-registered with the new hash.
        if old_hash and old_hash != credential_hash:
            update_doc["$unset"] = {
                "onChainRegistered": "",
                "transactionHash": "",
                "registeredAt": "",
            }
        await cred_coll.update_one(
            {"_id": credential_id},
            update_doc,
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

        # Contract reverts if expiry <= block.timestamp (InvalidExpiry)
        now_ts = int(datetime.now(timezone.utc).timestamp())
        if expiry_uint64 <= now_ts:
            raise ValueError("Credential is not eligible for registration: credential has expired")

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

    # --- Use Case 8: Revoke Credential ---

    @classmethod
    async def revoke_credential(cls, credential_id: str, reason: str | None = None) -> CredentialRevokeResponse:
        """
        Revoke a credential on-chain and mark as revoked in MongoDB.
        Credential must exist, be registered on-chain, and not already revoked.

        Raises:
            ValueError("Credential not found")
            ValueError("Credential is not registered on-chain")
            ValueError("Credential is already revoked")
            RuntimeError when contract call fails.
        """
        db = get_database()
        cred_coll = db[CREDENTIALS_COLLECTION]

        cred_doc = await cred_coll.find_one({"_id": credential_id})
        if not cred_doc:
            raise ValueError("Credential not found")

        if not cred_doc.get("onChainRegistered"):
            raise ValueError("Credential is not registered on-chain")

        if cred_doc.get("revoked") or cred_doc.get("status") == "revoked":
            raise ValueError("Credential is already revoked")

        credential_hash = cred_doc.get("credentialHash")
        if not credential_hash:
            raise ValueError("Credential has no credentialHash")

        # Contract uses uint8 reason code; we store human-readable reason in MongoDB
        reason_code = 0
        tx_hash = revoke_credential_on_chain(credential_hash, reason_code)
        if not tx_hash:
            raise RuntimeError("Failed to revoke credential on-chain")

        now = datetime.now(timezone.utc)
        await cred_coll.update_one(
            {"_id": credential_id},
            {
                "$set": {
                    "status": "revoked",
                    "revoked": True,
                    "revocationReason": (reason or "").strip() or None,
                    "revokedAt": now,
                    "revocationTxHash": tx_hash,
                }
            },
        )
        logger.info("Credential revoked: credentialId=%s, txHash=%s", credential_id, tx_hash)

        return CredentialRevokeResponse(
            credential_id=credential_id,
            credential_hash=credential_hash,
            transaction_hash=tx_hash,
            status="revoked",
            message="Credential revoked successfully",
        )

    # --- Use Case 9: Check Credential Status ---

    @classmethod
    async def get_credential_status(cls, credential_id: str) -> CredentialStatusResponse:
        """
        Fetch current status of a credential: DB + on-chain (registered, revoked, expired).
        Raises ValueError("Credential not found") when no credential exists.
        """
        db = get_database()
        cred_coll = db[CREDENTIALS_COLLECTION]

        cred_doc = await cred_coll.find_one({"_id": credential_id})
        if not cred_doc:
            raise ValueError("Credential not found")

        credential_hash = cred_doc.get("credentialHash") or ""
        db_status = cred_doc.get("status", "active")

        registered_on_chain = False
        revoked = bool(cred_doc.get("revoked"))
        expired = False

        if credential_hash:
            reg, rev, expiry_ts = get_credential_status(credential_hash)
            if reg is not None:
                registered_on_chain = reg
            if rev is not None:
                revoked = revoked or rev
            if expiry_ts is not None:
                now_ts = int(datetime.now(timezone.utc).timestamp())
                expired = now_ts > expiry_ts

        # If DB says revoked, ensure we report revoked
        if db_status == "revoked":
            revoked = True

        return CredentialStatusResponse(
            credentialId=credential_id,
            credentialHash=credential_hash,
            registeredOnChain=registered_on_chain,
            revoked=revoked,
            expired=expired,
            status=db_status,
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

    # --- Use Case 10: List Credentials for a User ---

    @classmethod
    async def list_credentials_by_wallet(cls, wallet_address: str) -> CredentialsByWalletListResponse:
        """
        Return all credentials linked to the given wallet address (summary: credentialId, status, issuedAt, expiry).
        Raises ValueError("Wallet address is invalid") or ValueError("No credentials found for this wallet").
        """
        raw = (wallet_address or "").strip()
        if not _WALLET_ADDRESS_PATTERN.match(raw):
            raise ValueError("Wallet address is invalid")

        db = get_database()
        cred_coll = db[CREDENTIALS_COLLECTION]

        docs = await cred_coll.find(
            {"$or": [{"subjectWallet": raw}, {"subjectWallet": raw.lower()}]}
        ).to_list(length=None)
        items: list[CredentialSummaryItem] = []
        for doc in docs:
            cred_id = doc.get("_id") or doc.get("credentialId", "")
            if isinstance(cred_id, bytes):
                cred_id = cred_id.hex()
            cred_id_str = str(cred_id)
            issued_at = cls._datetime_to_iso(doc.get("issuedAt"))
            expiry = cls._datetime_to_iso(doc.get("expiry"))
            items.append(
                CredentialSummaryItem(
                    credentialId=cred_id_str,
                    status=doc.get("status", "active"),
                    issuedAt=issued_at,
                    expiry=expiry,
                )
            )

        if not items:
            raise ValueError("No credentials found for this wallet")

        return CredentialsByWalletListResponse(
            walletAddress=raw,
            credentials=items,
        )

    # --- Use Case 7: Verify Credential ---

    @staticmethod
    def verify_credential(credential_dict: dict, signature: str) -> CredentialVerifyResponse:
        """
        Verify a credential presented by a user. Backend does not trust user fields:
        recomputes credential hash (same 6 fields as sign, no dates), verifies issuer
        signature, checks on-chain status (registered, not revoked, not expired).
        """
        # Same 6 fields as sign (no issuedAt/expiry) so hash never depends on date format
        payload = {
            "credentialId": str(credential_dict.get("credentialId", "")),
            "issuer": str(credential_dict.get("issuer", "")),
            "subjectWallet": str(credential_dict.get("subjectWallet", "")),
            "identityVerified": bool(credential_dict.get("identityVerified", True)),
            "idType": str(credential_dict.get("idType", "")),
            "status": str(credential_dict.get("status", "active")),
        }
        credential_hash = credential_document_hash(payload)
        expected_issuer = (os.getenv("KYC_PROVIDER_ADDRESS") or "").strip()
        signature_valid = verify_credential_signature(credential_hash, signature, expected_issuer)

        registered, revoked, expiry_ts = get_credential_status(credential_hash)
        registered_on_chain = registered is True
        revoked_flag = revoked is True
        now_ts = int(datetime.now(timezone.utc).timestamp())
        expired = expiry_ts is not None and now_ts > expiry_ts

        verification_status = "valid" if (
            signature_valid and registered_on_chain and not revoked_flag and not expired
        ) else "invalid"
        message = (
            "Credential verified successfully" if verification_status == "valid"
            else "Credential verification failed"
        )

        return CredentialVerifyResponse(
            credentialHash=credential_hash,
            signatureValid=signature_valid,
            registeredOnChain=registered_on_chain,
            revoked=revoked_flag,
            expired=expired,
            verificationStatus=verification_status,
            message=message,
        )
