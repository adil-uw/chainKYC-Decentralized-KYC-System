import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# load environment variables
load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL")

async def test_connection():
    client = AsyncIOMotorClient(MONGO_URL)

    # list databases
    databases = await client.list_database_names()

    print("✅ Connected to MongoDB Atlas")
    print("Databases:", databases)

asyncio.run(test_connection())