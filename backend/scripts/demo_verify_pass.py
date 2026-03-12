"""
Demo: Show Verify Credential passing (Use Case 7).
Run with backend up: python scripts/demo_verify_pass.py
Prints PASS and the verification result so you can show your professor.
"""
import json
import urllib.request
import sys

BASE = "http://127.0.0.1:8000"

def req(method, path, body=None):
    url = BASE + path
    data = body.encode() if body else None
    r = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode()) if e.fp else {}

def main():
    print("=== ChainKYC Verify Credential Demo (Use Case 7) ===\n")
    # 1. Get a wallet that has credentials
    try:
        code, stats = req("GET", "/api/stats")
        if code != 200 or stats.get("issuedCredentials", 0) == 0:
            print("No credentials in DB. Issue a credential first (Provider Dashboard -> Issue Credential), then run this again.")
            sys.exit(1)
    except Exception as e:
        print("Backend not reachable at", BASE, "- start it with: cd backend && python -m uvicorn main:app --reload --port 8000")
        sys.exit(1)

    # 2. Find a wallet that has a signed credential
    code, list_data = req("GET", "/api/kyc/requests")
    if code != 200:
        list_data = []
    wallets = [ (x.get("walletAddress") or "").strip() for x in (list_data or []) if (x.get("walletAddress") or "").strip() and (x.get("walletAddress") or "").strip() != "null" ]
    if not wallets:
        wallets = ["0x9c8725dfb7525939145747bed232da41659dcfad"]
    package = None
    wallet = None
    for w in wallets:
        code, p = req("GET", f"/api/credentials/by-wallet/{w}?format=package")
        if code == 200 and p.get("credential") and p.get("signature"):
            package = p
            wallet = w
            break
    if not package or not wallet:
        print("No signed credential found for any wallet. Do: 1) Submit KYC, 2) Link wallet, 3) Issue credential, 4) Hash & Sign. Then run this again.")
        sys.exit(1)

    # 4. Verify that credential + signature
    if not package.get("signature"):
        print("Credential for this wallet has no signature. Run Hash & Sign (Provider Dashboard) for this credential, then run this script again.")
        sys.exit(1)
    body = json.dumps({"credential": package["credential"], "signature": package["signature"]})
    code, result = req("POST", "/api/credentials/verify", body)

    if code != 200:
        print("Verify returned", code, result)
        sys.exit(1)

    print("Step 1: Retrieved credential + signature for wallet:", wallet[:20] + "...")
    print("Step 2: Called POST /api/credentials/verify with that credential and signature\n")
    print("--- Verification Result ---")
    print(json.dumps(result, indent=2))
    print("---")
    if result.get("signatureValid") is True:
        print("\n*** PASS: Signature is valid. The credential was signed by the KYC provider. ***")
        if result.get("verificationStatus") == "valid":
            print("*** PASS: Full verification status is VALID (signature + on-chain + not revoked + not expired). ***")
        else:
            print("(verificationStatus is not 'valid' because of on-chain/revoked/expired; signature check still passed.)")
    else:
        print("\n*** Signature valid: NO. Use a credential that has been through Hash & Sign. ***")
    return 0 if result.get("signatureValid") else 1

if __name__ == "__main__":
    sys.exit(main())
