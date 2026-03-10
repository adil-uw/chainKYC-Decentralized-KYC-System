"""
KYC Service — Use Case 1: Submit KYC Data Off-Chain.

Contains all business logic for submitting a KYC request:
validation, duplicate check, and saving to MongoDB.
No blockchain or credential issuance in this use case.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from database import get_database
from schemas.kyc_schema import KYCSubmitRequest, KYCSubmitResponse


# Collection name as specified in the use case
KYC_REQUESTS_COLLECTION = "kyc_requests"


class KYCService:
    """Handles KYC submission and (in future use cases) credential issuance."""

    @staticmethod
    async def submit_kyc_request(data: KYCSubmitRequest) -> KYCSubmitResponse:
        """
        Validate the request, check for duplicate pending request, then store in MongoDB.

        Business rules:
        - Required fields (fullName, dateOfBirth, address) are validated by Pydantic.
        - At least one of ssn or driverLicenseNumber is validated by schema.
        - Duplicate = existing document with status "pending" and same identity details.
        - New document is always created with status "pending".

        Returns:
            KYCSubmitResponse with kycRequestId and status.

        Raises:
            ValueError with message "A pending KYC request already exists for this user"
                if a duplicate is found (caller should map to 409 Conflict).
            Exception on DB failure (caller should map to 500).
        """
        db = get_database()
        collection = db[KYC_REQUESTS_COLLECTION]

        # Build query to find a pending request with the same identity details.
        # Same person = same fullName, dateOfBirth, and same value for any provided id proof.
        duplicate_query = {
            "status": "pending",
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

        # Build the document to store. Use camelCase keys to match the API spec and example doc.
        now = datetime.now(timezone.utc)
        doc = {
            "fullName": data.full_name,
            "dateOfBirth": data.date_of_birth,
            "address": data.address,
            "ssn": data.ssn,
            "driverLicenseNumber": data.driver_license_number,
            "email": data.email,
            "phoneNumber": data.phone_number,
            "status": "pending",
            "submittedAt": now,
            "updatedAt": now,
        }

        result = await collection.insert_one(doc)
        # Use MongoDB ObjectId as the unique KYC request ID (string for the API)
        kyc_request_id = str(result.inserted_id)

        return KYCSubmitResponse(
            message="KYC request submitted successfully",
            kyc_request_id=kyc_request_id,
            status="pending",
        )
