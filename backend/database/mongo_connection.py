"""
MongoDB connection for the backend.
Uses Motor (async) so FastAPI can use async endpoints.
Connection is opened at app startup and closed on shutdown.
"""

import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

# Single client instance; set when init_mongo() runs at startup
_client: Optional[AsyncIOMotorClient] = None
_db_name: str = "chainkyc"


def get_database() -> AsyncIOMotorDatabase:
    """
    Return the application MongoDB database.
    Must only be called after init_mongo() has run (e.g. inside request handlers).
    """
    if _client is None:
        raise RuntimeError("MongoDB not initialized. Call init_mongo() at startup.")
    return _client[_db_name]


async def init_mongo(mongo_url: Optional[str] = None, db_name: Optional[str] = None) -> None:
    """
    Create the MongoDB connection. Call once at FastAPI startup.
    Uses MONGODB_URL from environment if mongo_url is not provided.
    """
    global _client, _db_name
    url = mongo_url or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    if db_name:
        _db_name = db_name
    _client = AsyncIOMotorClient(url)


async def close_connection() -> None:
    """Close the MongoDB connection. Call on FastAPI shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
