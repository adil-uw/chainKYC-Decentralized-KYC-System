"""
MongoDB connection for the backend.
Uses Motor (async) so FastAPI can use async endpoints.
Connection is opened at app startup and closed on shutdown.
Always loads backend/.env so MONGODB_URL is from your config (Atlas or local).
Database name: from MONGODB_DATABASE env, or from URL path (e.g. ...net/dbname?...) or default "chainkyc".
"""

import os
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

# Single client instance; set when init_mongo() runs at startup
_client: Optional[AsyncIOMotorClient] = None
_db_name: str = "chainkyc"

# Backend directory so we can load .env even when process cwd is project root
_BACKEND_DIR = Path(__file__).resolve().parent.parent


def _database_name_from_url(url: str) -> Optional[str]:
    """Extract database name from MongoDB URL if present: ...host/dbname?options"""
    try:
        parsed = urlparse(url)
        path = (parsed.path or "").strip().lstrip("/")
        if path and "?" in path:
            path = path.split("?")[0]
        return path or None
    except Exception:
        return None


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
    Loads backend/.env so MONGODB_URL is always from your config (preserves Atlas and previous data).
    Database name: 1) db_name arg, 2) MONGODB_DATABASE env, 3) from URL path, 4) default "chainkyc".
    """
    global _client, _db_name
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=_BACKEND_DIR / ".env")
    except Exception:
        pass
    url = mongo_url or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    if db_name:
        _db_name = db_name
    else:
        env_db = (os.getenv("MONGODB_DATABASE") or "").strip()
        url_db = _database_name_from_url(url)
        if env_db:
            _db_name = env_db
        elif url_db:
            _db_name = url_db
        # else keep default "chainkyc"
    _client = AsyncIOMotorClient(url)
    _sanitized = url.split("@")[-1].split("/")[0].split("?")[0] if "@" in url else "local"
    import logging
    logging.getLogger("uvicorn.error").info("MongoDB: connected to %s, database=%s", _sanitized, _db_name)


async def close_connection() -> None:
    """Close the MongoDB connection. Call on FastAPI shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
