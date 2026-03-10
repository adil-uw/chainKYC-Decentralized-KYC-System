# Business logic lives in services. Routers call services only.

from services.kyc_service import KYCService

__all__ = ["KYCService"]
