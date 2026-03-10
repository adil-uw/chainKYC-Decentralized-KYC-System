"""
Canonical hash of a credential document for signing and verification.

Same credential content must always produce the same hash (deterministic JSON).
"""

import hashlib
import json
from datetime import datetime
from typing import Any, Dict


def _serialize_value(v: Any) -> Any:
    """Convert values to JSON-serializable form; datetimes to ISO strings."""
    if isinstance(v, datetime):
        return v.isoformat().replace("+00:00", "Z")
    if isinstance(v, dict):
        return {k: _serialize_value(val) for k, val in sorted(v.items())}
    if isinstance(v, list):
        return [_serialize_value(x) for x in v]
    return v


def credential_document_hash(credential_dict: Dict[str, Any]) -> str:
    """
    Produce a deterministic SHA-256 hash of the credential document.
    Uses canonical JSON: sorted keys, no extra whitespace.
    Returns 0x-prefixed hex string (e.g. for display and signing).
    """
    # Build a serializable copy with sorted keys and normalized values
    normalized = {k: _serialize_value(v) for k, v in sorted(credential_dict.items())}
    canonical = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return "0x" + digest
