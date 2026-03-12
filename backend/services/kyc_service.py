"""
KYC Service — Use Cases 1 (submit), 2 (screen), 3 (link wallet).

- Use Case 1: Submit KYC data off-chain; store in MongoDB with status "approved" (auto-approved).
- Use Case 2: Screen pending request against hardcoded blacklist; set approved/rejected.
- Use Case 3: Link wallet address to an approved KYC record.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from pymongo import ReturnDocument
from database import get_database
from schemas.kyc_schema import (
    KYCSubmitRequest,
    KYCSubmitResponse,
    KYCScreenResponse,
    LinkWalletRequest,
    LinkWalletResponse,
)


# Collection name as specified in the use case
KYC_REQUESTS_COLLECTION = "kyc_requests"

# --- Use Case 2: Hardcoded blacklist for off-chain screening (simulates KYC provider checks) ---
BLACKLISTED_NAMES = ["John Blacklisted", "The Joker", "Thanos"]
BLACKLISTED_SSNS = ["99-99-99"]
BLACKLISTED_DRIVER_LICENSES = ["dl-99-99"]


def _doc_to_response(doc: dict) -> dict[str, Any]:
    """Convert MongoDB KYC request document to API response dict (camelCase, kycRequestId)."""
    if not doc:
        return {}
    out = {
        "kycRequestId": str(doc["_id"]),
        "fullName": doc.get("fullName"),
        "dateOfBirth": doc.get("dateOfBirth"),
        "address": doc.get("address"),
        "status": doc.get("status"),
        "ssn": doc.get("ssn"),
        "driverLicenseNumber": doc.get("driverLicenseNumber"),
        "email": doc.get("email"),
        "phoneNumber": doc.get("phoneNumber"),
        "walletAddress": doc.get("walletAddress"),
        "rejectionReason": doc.get("rejectionReason"),
    }
    for key in ("submittedAt", "updatedAt", "reviewedAt", "walletLinkedAt"):
        val = doc.get(key)
        if isinstance(val, datetime):
            out[key] = val.isoformat()
        elif val is not None:
            out[key] = val
    return out


class KYCService:
    """Handles KYC submission and (in future use cases) credential issuance."""

    @staticmethod
    async def submit_kyc_request(data: KYCSubmitRequest) -> KYCSubmitResponse:
        """
        Validate the request, check for duplicate pending request, then store in MongoDB.

        Business rules:
        - Required fields (fullName, dateOfBirth, address) are validated by Pydantic.
        - At least one of ssn or driverLicenseNumber is validated by schema.
        - Duplicate = existing document with status "pending" or "approved" and same identity details.
        - New document is always created with status "approved" (auto-approved, no screening step).

        Returns:
            KYCSubmitResponse with kycRequestId and status.

        Raises:
            ValueError with message "A pending KYC request already exists for this user"
                if a duplicate is found (caller should map to 409 Conflict).
            Exception on DB failure (caller should map to 500).
        """
        db = get_database()
        collection = db[KYC_REQUESTS_COLLECTION]

        # Build query to find an existing (pending or approved) request with the same identity details.
        duplicate_query = {
            "status": {"$in": ["pending", "approved"]},
            "fullName": data.full_name,
            "dateOfBirth": data.date_of_birth,
        }
        # Include whichever identity field(s) the user provided so we match the same person
        if data.ssn:
            duplicate_query["ssn"] = data.ssn
        if data.driver_license_number:
            duplicate_query["driverLicenseNumber"] = data.driver_license_number

        existing = await collection.find_one(duplicate_query)
        if existing:
            raise ValueError("A pending KYC request already exists for this user")

        # SSN and driver license must be unique across all KYC requests (one identity per record).
        if data.ssn:
            ssn_taken = await collection.find_one({"ssn": data.ssn})
            if ssn_taken:
                raise ValueError("SSN is already associated with a KYC request")
        if data.driver_license_number:
            license_taken = await collection.find_one({"driverLicenseNumber": data.driver_license_number})
            if license_taken:
                raise ValueError("Driver license number is already associated with a KYC request")

        # Build the document to store. Use camelCase keys. Auto-approved (no screening step).
        now = datetime.now(timezone.utc)
        doc = {
            "fullName": data.full_name,
            "dateOfBirth": data.date_of_birth,
            "address": data.address,
            "ssn": data.ssn,
            "driverLicenseNumber": data.driver_license_number,
            "email": data.email,
            "phoneNumber": data.phone_number,
            "status": "approved",
            "submittedAt": now,
            "updatedAt": now,
            "reviewedAt": now,
        }

        result = await collection.insert_one(doc)
        # Use MongoDB ObjectId as the unique KYC request ID (string for the API)
        kyc_request_id = str(result.inserted_id)

        return KYCSubmitResponse(
            message="KYC request submitted successfully",
            kyc_request_id=kyc_request_id,
            status="approved",
        )

    # --- Get one KYC request (for status page and screening details) ---

    @staticmethod
    async def get_kyc_request(kyc_request_id: str) -> dict[str, Any]:
        """
        Return a single KYC request by id. Raises ValueError("KYC request not found") if not found.
        If the request is still "pending", it is auto-approved in DB and the response always
        shows "approved" so the user never sees "pending".
        """
        db = get_database()
        collection = db[KYC_REQUESTS_COLLECTION]
        raw = (kyc_request_id or "").strip()
        if not raw or not ObjectId.is_valid(raw):
            raise ValueError("KYC request not found")
        oid = ObjectId(raw)
        doc = await collection.find_one({"_id": oid})
        if not doc:
            raise ValueError("KYC request not found")

        # Auto-approve: any non-rejected request becomes "approved" when fetched
        if doc.get("status") == "pending":
            now = datetime.now(timezone.utc)
            await collection.update_one(
                {"_id": oid},
                {"$set": {"status": "approved", "reviewedAt": now, "updatedAt": now}},
            )
            doc = await collection.find_one({"_id": oid})
        # Never return "pending" to the client — force approved for any non-rejected
        if doc and doc.get("status") == "pending":
            doc["status"] = "approved"
        return _doc_to_response(doc)

    # --- List KYC requests (for provider dashboard and issue credential) ---

    @staticmethod
    async def list_kyc_requests(status: Optional[str] = None) -> list[dict[str, Any]]:
        """
        Return list of KYC requests, optionally filtered by status (approved, rejected).
        All pending requests are auto-approved first so there is no pending list.
        """
        db = get_database()
        collection = db[KYC_REQUESTS_COLLECTION]
        # Auto-approve all pending so we never have a pending list
        now = datetime.now(timezone.utc)
        await collection.update_many(
            {"status": "pending"},
            {"$set": {"status": "approved", "reviewedAt": now, "updatedAt": now}},
        )
        query = {}
        if status and status.strip().lower() in ("pending", "approved", "rejected"):
            query["status"] = status.strip().lower()
        cursor = collection.find(query).sort("submittedAt", -1)
        return [_doc_to_response(d) for d in await cursor.to_list(length=500)]

    # --- Use Case 2: Perform Off-Chain KYC Screening ---

    @staticmethod
    async def screen_kyc_request(kyc_request_id: str) -> KYCScreenResponse:
        """
        Screen a pending KYC request against the hardcoded blacklist.
        Updates the document to "approved" or "rejected" and returns the result.

        Screening rules (first match wins):
        - If fullName in blacklist → reject (reason: "Name matched blacklist")
        - If ssn in blacklist → reject (reason: "SSN matched blacklist")
        - If driverLicenseNumber in blacklist → reject (reason: "Driver license matched blacklist")
        - Otherwise → approve

        Raises:
            ValueError("KYC request not found") when no document with that id exists.
            ValueError("KYC request already processed") when status is not "pending".
        """
        db = get_database()
        collection = db[KYC_REQUESTS_COLLECTION]

        # Resolve id: we store MongoDB ObjectId, so kycRequestId is str(inserted_id)
        if not ObjectId.is_valid(kyc_request_id):
            raise ValueError("KYC request not found")
        oid = ObjectId(kyc_request_id)

        doc = await collection.find_one({"_id": oid})
        if not doc:
            raise ValueError("KYC request not found")

        if doc.get("status") != "pending":
            raise ValueError("KYC request already processed")

        now = datetime.now(timezone.utc)
        full_name = doc.get("fullName") or ""
        ssn = doc.get("ssn")
        driver_license = doc.get("driverLicenseNumber")

        # Check blacklist in order: name, SSN, driver license (spec order)
        if full_name.strip() in BLACKLISTED_NAMES:
            status = "rejected"
            reason = "Name matched blacklist"
        elif ssn and ssn.strip() in BLACKLISTED_SSNS:
            status = "rejected"
            reason = "SSN matched blacklist"
        elif driver_license and driver_license.strip() in BLACKLISTED_DRIVER_LICENSES:
            status = "rejected"
            reason = "Driver license matched blacklist"
        else:
            status = "approved"
            reason = None

        # Update document: status, reviewedAt; if rejected add rejectionReason
        update = {
            "status": status,
            "reviewedAt": now,
            "updatedAt": now,
        }
        if status == "rejected":
            update["rejectionReason"] = reason

        await collection.update_one({"_id": oid}, {"$set": update})

        if status == "approved":
            return KYCScreenResponse(
                kyc_request_id=kyc_request_id,
                status="approved",
                message="KYC screening passed",
                reason=None,
            )
        return KYCScreenResponse(
            kyc_request_id=kyc_request_id,
            status="rejected",
            message="KYC screening failed",
            reason=reason,
        )

    # --- Use Case 3: Link Wallet Address to Approved User ---

    @staticmethod
    async def link_wallet(kyc_request_id: str, data: LinkWalletRequest) -> LinkWalletResponse:
        """
        Link an Ethereum wallet address to an approved KYC request.
        Wallet address is validated by the request schema (Ethereum format).

        Raises:
            ValueError("KYC request not found") when no document with that id exists.
            ValueError("Wallet can only be linked to an approved KYC request") when status != "approved".
        """
        db = get_database()
        collection = db[KYC_REQUESTS_COLLECTION]

        if not ObjectId.is_valid(kyc_request_id):
            raise ValueError("KYC request not found")
        oid = ObjectId(kyc_request_id)

        doc = await collection.find_one({"_id": oid})
        if not doc:
            raise ValueError("KYC request not found")

        if doc.get("status") != "approved":
            raise ValueError("Wallet can only be linked to an approved KYC request")

        now = datetime.now(timezone.utc)
        wallet_address = data.wallet_address.strip()

        # Wallet address must be unique: cannot link a wallet already linked to another KYC request.
        existing_wallet = await collection.find_one(
            {"walletAddress": wallet_address, "_id": {"$ne": oid}}
        )
        if existing_wallet:
            raise ValueError("Wallet address is already linked to another KYC request")

        await collection.update_one(
            {"_id": oid},
            {
                "$set": {
                    "walletAddress": wallet_address,
                    "walletLinkedAt": now,
                    "updatedAt": now,
                }
            },
        )

        return LinkWalletResponse(
            kyc_request_id=kyc_request_id,
            status="approved",
            wallet_address=wallet_address,
            message="Wallet linked successfully",
        )
