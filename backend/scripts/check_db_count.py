"""Connect exactly like the backend and count kyc_requests."""
import asyncio
import os
import sys
from pathlib import Path
_backend = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_backend))
os.chdir(_backend)
from dotenv import load_dotenv
load_dotenv(dotenv_path=_backend / ".env")

url = os.getenv("MONGODB_URL", "")
db_name = (os.getenv("MONGODB_DATABASE") or "chainkyc").strip()
print(f"MONGODB_URL (first 60 chars): {url[:60]}...")
print(f"MONGODB_DATABASE: {db_name!r}")

async def main():
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(url)
    db = client[db_name]
    kyc_count = await db["kyc_requests"].count_documents({})
    cred_count = await db["credentials"].count_documents({})
    print(f"kyc_requests: {kyc_count}, credentials: {cred_count}")
    client.close()

asyncio.run(main())
