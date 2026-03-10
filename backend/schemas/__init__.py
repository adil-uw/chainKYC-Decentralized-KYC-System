# API request/response schemas (Pydantic models).
# Used for validation and serialization at the router layer.

from schemas.kyc_schema import KYCSubmitRequest, KYCSubmitResponse

__all__ = ["KYCSubmitRequest", "KYCSubmitResponse"]
