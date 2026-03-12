"""
Seed MongoDB with sample KYC requests and credentials so the app shows data.

Run from project root or backend folder:
  cd backend && python scripts/seed_data.py

Uses MONGODB_URL from backend/.env. Does not delete existing data; adds sample records.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Ensure backend root is on path and load .env
BACKEND_DIR = Path(__file__).resolve().parent.parent
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from database.mongo_connection import init_mongo, close_connection, get_database
from bson import ObjectId


KYC_COLLECTION = "kyc_requests"
CRED_COLLECTION = "credentials"


async def seed():
    await init_mongo()
    db = get_database()
    kyc_coll = db[KYC_COLLECTION]
    cred_coll = db[CRED_COLLECTION]

    now = datetime.now(timezone.utc)
    sample_wallet = "0xf5c171e9a397a7ca4102eb59271819b6d86da801"  # lowercase

    # Sample KYC requests (approved, with wallet linked)
    sample_kyc = [
        {
            "_id": ObjectId(),
            "fullName": "Alice Smith",
            "dateOfBirth": "1990-05-15",
            "address": "456 Oak Ave, City",
            "ssn": "123-45-6789",
            "driverLicenseNumber": None,
            "email": "alice@example.com",
            "phoneNumber": "+1234567890",
            "status": "approved",
            "walletAddress": sample_wallet,
            "submittedAt": now,
            "updatedAt": now,
            "reviewedAt": now,
            "walletLinkedAt": now,
        },
        {
            "_id": ObjectId(),
            "fullName": "Bob Jones",
            "dateOfBirth": "1985-11-20",
            "address": "789 Pine St, Town",
            "ssn": None,
            "driverLicenseNumber": "DL-123456",
            "email": "bob@example.com",
            "phoneNumber": None,
            "status": "approved",
            "walletAddress": sample_wallet,
            "submittedAt": now,
            "updatedAt": now,
            "reviewedAt": now,
            "walletLinkedAt": now,
        },
    ]

    inserted_kyc = 0
    for doc in sample_kyc:
        existing = await kyc_coll.find_one(
            {"fullName": doc["fullName"], "status": "approved"}
        )
        if not existing:
            await kyc_coll.insert_one(doc)
            inserted_kyc += 1
            print(f"  Inserted KYC: {doc['fullName']} -> {doc['_id']}")

    if inserted_kyc == 0:
        print("  No new KYC requests inserted (samples may already exist).")
    else:
        print(f"  Inserted {inserted_kyc} KYC request(s).")

    # Sample credential (for the first KYC)
    first_kyc = await kyc_coll.find_one({"status": "approved", "walletAddress": {"$exists": True, "$ne": ""}})
    if first_kyc:
        kyc_id = str(first_kyc["_id"])
        cred_id = "cred_" + str(ObjectId())
        expiry = now + timedelta(days=365)
        cred_doc = {
            "_id": cred_id,
            "kycRequestId": kyc_id,
            "issuer": "KYCProvider",
            "subjectWallet": sample_wallet,
            "fullName": first_kyc.get("fullName", "Alice Smith"),
            "identityVerified": True,
            "idType": "ssn" if first_kyc.get("ssn") else "driverLicense",
            "issuedAt": now,
            "expiry": expiry,
            "status": "active",
        }
        existing_cred = await cred_coll.find_one({"kycRequestId": kyc_id})
        if not existing_cred:
            await cred_coll.insert_one(cred_doc)
            print(f"  Inserted credential: {cred_id} for KYC {kyc_id}")
        else:
            print("  Credential for this KYC already exists, skip.")
    else:
        print("  No approved wallet-linked KYC found; no credential inserted.")

    await close_connection()
    print("Done. Restart or refresh the app to see the data.")


if __name__ == "__main__":
    asyncio.run(seed())
