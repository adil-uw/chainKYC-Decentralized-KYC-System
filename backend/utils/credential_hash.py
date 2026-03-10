"""
Canonical hash of a credential document for signing and verification.

Same credential content must always produce the same hash (deterministic JSON).
ISO date strings are normalized to UTC with 'Z' so get-credential and verify match.
"""

import hashlib
import json
import re
from datetime import datetime
from typing import Any, Dict

def _normalize_iso_string(s: str) -> str:
    """
    Normalize ISO datetime strings to a single canonical form for hashing:
    - Replace +00:00 with Z; add Z if no timezone.
    - Strip trailing zeros in fractional seconds so .015000 and .015 match.
    """
    if not isinstance(s, str) or not s.strip():
        return s
    s = s.strip()
    if s.endswith("+00:00"):
        s = s.replace("+00:00", "Z")
    # Match ISO datetime: base + optional .frac + optional Z
    m = re.match(
        r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z)?$",
        s,
    )
    if m:
        base, frac, z = m.group(1), m.group(2) or "", m.group(3) or ""
        if frac:
            # Strip trailing zeros: .015000 -> .015 so sign and verify match
            frac_trimmed = frac[1:].rstrip("0")
            frac = "." + frac_trimmed if frac_trimmed else ""
        return base + frac + "Z"
    return s


def _serialize_value(v: Any) -> Any:
    """Convert values to JSON-serializable form; datetimes and date strings to canonical ISO (UTC Z)."""
    if isinstance(v, datetime):
        raw = v.isoformat().replace("+00:00", "Z")
        return _normalize_iso_string(raw)
    if isinstance(v, str):
        return _normalize_iso_string(v)
    if isinstance(v, dict):
        return {k: _serialize_value(val) for k, val in sorted(v.items())}
    if isinstance(v, list):
        return [_serialize_value(x) for x in v]
    return v


def credential_document_hash(credential_dict: Dict[str, Any]) -> str:
    """
    Produce a deterministic SHA-256 hash of the credential document (same as at issuance).
    Uses canonical JSON: sorted keys, no extra whitespace. Used for signing (UC5), on-chain
    registration (UC6), and verification (UC7). Returns 0x-prefixed hex string.
    """
    # Build a serializable copy with sorted keys and normalized values
    normalized = {k: _serialize_value(v) for k, v in sorted(credential_dict.items())}
    canonical = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return "0x" + digest
