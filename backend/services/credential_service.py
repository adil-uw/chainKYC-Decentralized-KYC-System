"""
Credential Service — Use Case 4: Issue Verifiable Credential.

Creates a credential from an approved, wallet-linked KYC request
and stores it in the credentials collection (ready for later hashing/on-chain).
"""

from datetime import datetime, timezone, timedelta

from bson import ObjectId
from database import get_database
from schemas.credential_schema import CredentialIssueResponse


KYC_REQUESTS_COLLECTION = "kyc_requests"
CREDENTIALS_COLLECTION = "credentials"
ISSUER = "KYCProvider"
CREDENTIAL_VALIDITY_YEARS = 1


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
