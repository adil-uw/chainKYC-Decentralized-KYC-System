"""
Find which database on Atlas has your KYC data (e.g. 27 requests).
Connects without a database in the URL so we can list all DBs and count kyc_requests.
Run from backend: python scripts/find_kyc_database.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Load .env from backend
_backend = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend))
os.chdir(_backend)

from dotenv import load_dotenv
load_dotenv(dotenv_path=_backend / ".env")

# Use base URL without database path so we can list all databases
url = (os.getenv("MONGODB_URL") or "").strip()
if not url.startswith("mongodb"):
    print("MONGODB_URL not set in backend/.env"); sys.exit(1)
# Strip database name: ...mongodb.net/chainkyc?retry... -> ...mongodb.net/?retry...
before_q = url.split("?")[0]
after_q = url.split("?", 1)[1] if "?" in url else ""
host_part = before_q.rsplit("/", 1)[0]  # ...mongodb.net
base_url = (host_part + "/?" + after_q) if after_q else (host_part + "/")

async def main():
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(base_url)
    try:
        db_names = await client.list_database_names()
        print("Databases on cluster and kyc_requests count:")
        print("-" * 50)
        found = []
        for name in db_names:
            if name in ("admin", "local", "config"):
                continue
            try:
                db = client[name]
                colls = await db.list_collection_names()
                kyc_count = 0
                cred_count = 0
                if "kyc_requests" in colls:
                    kyc_count = await db["kyc_requests"].count_documents({})
                if "credentials" in colls:
                    cred_count = await db["credentials"].count_documents({})
                print(f"  {name}: kyc_requests={kyc_count}, credentials={cred_count}")
                found.append((name, kyc_count, cred_count))
            except Exception as e:
                print(f"  {name}: error - {e}")
        print("-" * 50)
        best = max(found, key=lambda x: (x[1], x[2])) if found else None
        if best:
            print(f"Use database with most data: {best[0]} (kyc={best[1]}, credentials={best[2]})")
            print(f"\nIn backend/.env set MONGODB_URL to use that database:")
            print(f"  ...mongodb.net/{best[0]}?retryWrites=true&w=majority&appName=chainkyc-cluster")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
