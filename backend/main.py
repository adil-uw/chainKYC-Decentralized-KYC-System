"""
ChainKYC Backend — FastAPI application.

MongoDB is initialized at startup and closed on shutdown.
Validation errors (missing required fields) are returned as 400 with body {"message": "..."}.
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load .env so MONGODB_URL (and other vars) are available before init_mongo()
load_dotenv()

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from database.mongo_connection import init_mongo, close_connection
from routers.test import router as test_router
from routers.kyc_router import router as kyc_router
from routers.credentials_router import router as credentials_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open MongoDB connection at startup, close on shutdown."""
    await init_mongo()
    yield
    await close_connection()


app = FastAPI(lifespan=lifespan)


@app.get("/")
def read_root():
    return {"message": "FastAPI is running"}


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
