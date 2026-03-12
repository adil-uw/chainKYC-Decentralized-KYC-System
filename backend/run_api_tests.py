"""
Run API tests against local backend to verify test-case scenarios.
Usage: python run_api_tests.py [optional: API_BASE_URL env for base URL]
Requires: backend running (default http://127.0.0.1:8000). Use API_BASE_URL=http://127.0.0.1:8002 to test another port.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000")

def req(method, path, body=None):
    url = BASE + path
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.getcode(), json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
        except Exception:
            body = {}
        return e.code, body
    except Exception as e:
        return None, {"error": str(e)}

def main():
    passed = 0
    failed = 0

    # 1. Health
    code, data = req("GET", "/api/health")
    if code == 200 and data.get("status") == "ok":
        print("[PASS] GET /api/health -> 200, status ok")
        passed += 1
    else:
        print(f"[FAIL] GET /api/health -> {code} {data}")
        failed += 1

    # 2. Root
    code, data = req("GET", "/")
    if code == 200:
        print("[PASS] GET / -> 200")
        passed += 1
    else:
        print(f"[FAIL] GET / -> {code} {data}")
        failed += 1

    # 3. KYC submit - valid (test case: Valid with SSN only); use unique SSN to avoid 409
    unique = str(int(time.time() * 1000))[-9:]
    body = {
        "fullName": "Test User",
        "dateOfBirth": "1990-01-01",
        "address": "123 Test St",
        "ssn": f"999-{unique[:2]}-{unique[2:]}",
    }
    code, data = req("POST", "/api/kyc/submit", body)
    if code in (200, 201) and (data.get("kycRequestId") or data.get("message")):
        print("[PASS] POST /api/kyc/submit (valid SSN) -> kycRequestId / message returned")
        passed += 1
        kyc_id = data.get("kycRequestId")
    elif code == 409:
        # Duplicate: get any kyc id from list for screen test
        print("[PASS] POST /api/kyc/submit -> 409 (duplicate); using list for kycId")
        passed += 1
        _, list_data = req("GET", "/api/kyc/requests")
        reqs = list_data if isinstance(list_data, list) else list_data.get("requests", [])
        kyc_id = (reqs[0].get("kycRequestId") or reqs[0].get("_id") or str(reqs[0].get("_id"))) if reqs else None
    else:
        print(f"[FAIL] POST /api/kyc/submit -> {code} {data}")
        failed += 1
        kyc_id = None

    # 4. KYC submit - invalid (missing required)
    code, data = req("POST", "/api/kyc/submit", {"fullName": "Only Name"})
    if code == 400 and "message" in data:
        print("[PASS] POST /api/kyc/submit (missing fields) -> 400")
        passed += 1
    else:
        print(f"[FAIL] POST /api/kyc/submit invalid -> {code} {data}")
        failed += 1

    # 5. KYC submit - neither SSN nor driver license
    body_bad = {"fullName": "A", "dateOfBirth": "1990-01-01", "address": "B"}
    code, data = req("POST", "/api/kyc/submit", body_bad)
    if code == 400:
        print("[PASS] POST /api/kyc/submit (no SSN/driver) -> 400")
        passed += 1
    else:
        print(f"[FAIL] POST /api/kyc/submit no id -> {code} {data}")
        failed += 1

    # 6. Stats
    code, data = req("GET", "/api/stats")
    if code == 200 and "totalRequests" in data:
        print("[PASS] GET /api/stats -> 200, has totalRequests")
        passed += 1
    else:
        print(f"[FAIL] GET /api/stats -> {code} {data}")
        failed += 1

    # 7. KYC list
    code, data = req("GET", "/api/kyc/requests")
    if code == 200:
        print("[PASS] GET /api/kyc/requests -> 200")
        passed += 1
    else:
        print(f"[FAIL] GET /api/kyc/requests -> {code} {data}")
        failed += 1

    # 8. Screen (if we have kyc_id)
    if kyc_id:
        code, data = req("POST", f"/api/kyc/{kyc_id}/screen")
        if code == 200 and data.get("status") in ("approved", "rejected"):
            print("[PASS] POST /api/kyc/{id}/screen -> 200, status approved/rejected")
            passed += 1
        elif code == 409 and "already processed" in (data.get("message") or "").lower():
            print("[PASS] POST /api/kyc/{id}/screen -> 409 (already processed)")
            passed += 1
        else:
            print(f"[FAIL] POST screen -> {code} {data}")
            failed += 1
    else:
        print("[SKIP] Screen (no kycRequestId)")

    # 9. Verify - missing payload (test case: Missing payload)
    code, data = req("POST", "/api/credentials/verify", {})
    if code == 400 and "message" in data:
        print("[PASS] POST /api/credentials/verify (no body) -> 400")
        passed += 1
    else:
        print(f"[FAIL] POST verify no body -> {code} {data}")
        failed += 1

    # 10. Credential status - not found
    code, data = req("GET", "/api/credentials/nonexistent_id_12345/status")
    if code == 404:
        print("[PASS] GET /api/credentials/{id}/status (not found) -> 404")
        passed += 1
    else:
        print(f"[FAIL] GET status not found -> {code} {data}")
        failed += 1

    # 11. Issue credential - invalid kyc id (404)
    code, data = req("POST", "/api/credentials/issue/000000000000000000000000")
    if code == 404:
        print("[PASS] POST /api/credentials/issue (bad id) -> 404")
        passed += 1
    else:
        print(f"[FAIL] POST issue bad id -> {code} {data}")
        failed += 1

    # 12. List credentials by wallet - invalid address
    code, data = req("GET", "/api/credentials/by-wallet/not-an-address/list")
    if code in (400, 404):
        print("[PASS] GET /api/credentials/by-wallet/.../list (invalid addr) -> 400/404")
        passed += 1
    else:
        print(f"[FAIL] GET list invalid wallet -> {code} {data}")
        failed += 1

    # 13. Sign credential - not found
    code, data = req("POST", "/api/credentials/cred_nonexistent/sign")
    if code == 404:
        print("[PASS] POST /api/credentials/{id}/sign (not found) -> 404")
        passed += 1
    else:
        print(f"[FAIL] POST sign not found -> {code} {data}")
        failed += 1

    # 14. Revoke - not found
    code, data = req("POST", "/api/credentials/cred_nonexistent/revoke", {"reason": "test"})
    if code == 404:
        print("[PASS] POST /api/credentials/{id}/revoke (not found) -> 404")
        passed += 1
    else:
        print(f"[FAIL] POST revoke not found -> {code} {data}")
        failed += 1

    print()
    print(f"Result: {passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
