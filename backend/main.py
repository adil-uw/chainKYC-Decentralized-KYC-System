"""
ChainKYC Backend — FastAPI application.

MongoDB is initialized at startup and closed on shutdown.
Validation errors (missing required fields) are returned as 400 with body {"message": "..."}.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend directory so it works regardless of cwd (e.g. uvicorn from project root)
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path)

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database.mongo_connection import init_mongo, close_connection
from database import get_database
from routers.test import router as test_router
from routers.kyc_router import router as kyc_router
from routers.credentials_router import router as credentials_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open MongoDB connection at startup, close on shutdown."""
    import os
    _key = (os.getenv("KYC_PROVIDER_PRIVATE_KEY") or "").strip()
    logging.getLogger("uvicorn.error").info(
        "KYC signing key: %s", "configured" if _key else "NOT SET (Hash & Sign will fail)"
    )
    await init_mongo()
    yield
    await close_connection()


app = FastAPI(lifespan=lifespan)

# Allow frontend (Vite dev server or same origin) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
        "http://localhost:3002", "http://127.0.0.1:3002",
        "http://localhost:3003", "http://127.0.0.1:3003",
        "http://localhost:3004", "http://127.0.0.1:3004",
        "http://localhost:3005", "http://127.0.0.1:3005",
        "http://localhost:3006", "http://127.0.0.1:3006",
        "http://localhost:3007", "http://127.0.0.1:3007",
        "http://localhost:3008", "http://127.0.0.1:3008",
        "http://localhost:3009", "http://127.0.0.1:3009",
        "http://localhost:3010", "http://127.0.0.1:3010",
        "http://localhost:3017", "http://127.0.0.1:3017",
        "http://localhost:5173", "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "FastAPI is running"}


@app.get("/api/health")
def health():
    """Health check for frontend; confirms backend is up."""
    return {"status": "ok", "message": "Backend is running"}


@app.get("/api/stats")
async def stats():
    """Provider dashboard stats: KYC request counts and credential counts. No pending list: all pending are auto-approved."""
    try:
        from datetime import datetime, timezone
        db = get_database()
        kyc_coll = db["kyc_requests"]
        cred_coll = db["credentials"]
        # Auto-approve all pending so there is no pending list
        now = datetime.now(timezone.utc)
        await kyc_coll.update_many(
            {"status": "pending"},
            {"$set": {"status": "approved", "reviewedAt": now, "updatedAt": now}},
        )
        total_requests = await kyc_coll.count_documents({})
        pending = 0  # Never show pending; all are auto-approved
        approved = await kyc_coll.count_documents({"status": "approved"})
        rejected = await kyc_coll.count_documents({"status": "rejected"})
        issued_credentials = await cred_coll.count_documents({})
        registered_credentials = await cred_coll.count_documents(
            {"transactionHash": {"$exists": True, "$ne": ""}}
        )
        revoked_credentials = await cred_coll.count_documents({"status": "revoked"})
        return {
            "totalRequests": total_requests,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "issuedCredentials": issued_credentials,
            "registeredCredentials": registered_credentials,
            "revokedCredentials": revoked_credentials,
        }
    except Exception:
        return {
            "totalRequests": 0,
            "pending": 0,
            "approved": 0,
            "rejected": 0,
            "issuedCredentials": 0,
            "registeredCredentials": 0,
            "revokedCredentials": 0,
        }


@app.get("/api/debug/databases")
async def debug_list_databases():
    """List databases and kyc_requests count so you can see which DB has your 27 requests. Set MONGODB_DATABASE to that name in backend/.env."""
    try:
        db = get_database()
        client = db.client
        names = await client.list_database_names()
        result = []
        for name in names:
            if name in ("admin", "local", "config"):
                continue
            try:
                coll = client[name]["kyc_requests"]
                count = await coll.count_documents({})
                result.append({"database": name, "kyc_requests_count": count})
            except Exception:
                result.append({"database": name, "kyc_requests_count": None})
        return {"databases": result, "hint": "Set MONGODB_DATABASE in backend/.env to the database that has kyc_requests_count: 27, then restart backend."}
    except Exception as e:
        return {"error": str(e), "databases": []}


# Use Case 1: return 400 with {"message": "..."} for missing required fields (API spec)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """Convert Pydantic validation errors to 400 and a single 'message' for the client."""
    errors = exc.errors()
    # Check for missing required fields (body)
    missing = []
    for err in errors:
        if err.get("type") == "missing":
            loc = err.get("loc", ())
            if loc and loc[0] == "body":
                field = loc[-1] if len(loc) > 1 else None
                if field:
                    # Map snake_case to camelCase for spec message
                    name_map = {
                        "full_name": "fullName",
                        "date_of_birth": "dateOfBirth",
                        "address": "address",
                    }
                    missing.append(name_map.get(str(field), str(field)))
    if missing:
        message = "fullName, dateOfBirth, and address are required"
        return JSONResponse(status_code=400, content={"message": message})
    # Other validation errors (e.g. at_least_one_identity_proof) — use first error message
    first_msg = errors[0].get("msg", "Validation error") if errors else "Validation error"
    return JSONResponse(status_code=400, content={"message": first_msg})


app.include_router(test_router)
app.include_router(kyc_router)
app.include_router(credentials_router)
