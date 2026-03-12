# Running Tests and Verifying the Code

## Quick check (backend + frontend)

1. **Backend** — use **one** of these (ensure no other backend is using port 8000):
   - **PowerShell (recommended):** from project root run `.\backend\start_backend.ps1` so the app loads from the correct folder.
   - **Manual:**
     ```bash
     cd backend
     pip install -r requirements.txt
     uvicorn main:app --reload --host 0.0.0.0 --port 8000
     ```
   Backend should be at `http://127.0.0.1:8000`. Health: `GET http://127.0.0.1:8000/api/health`. You should see in the terminal: `KYC signing key: configured`.

2. **API tests** (with backend running on 8000):
   ```bash
   cd backend
   python run_api_tests.py
   ```
   To test a backend on another port: `API_BASE_URL=http://127.0.0.1:8002 python run_api_tests.py`
   Expect: **14 passed, 0 failed**. These cover:
   - Health, root
   - KYC submit (valid, missing fields, no SSN/driver)
   - Stats, KYC list
   - KYC screen
   - Verify (missing payload → 400)
   - Credential status/sign/revoke/issue/list (not found or invalid → 404/400)

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   Build must complete without errors. For dev: `npm run dev` and open the URL shown (e.g. http://localhost:5173).

## Test cases (UI)

The **API Scenarios / Test Cases** page in the app (`/test-cases`) lists all expected success and error scenarios. The automated script above exercises a subset of these against the live backend. The rest can be verified manually through the UI (Submit KYC, Screen, Connect Wallet, Issue, Sign, Register, Verify, Revoke).

## Summary

- **Backend**: All 14 API checks in `run_api_tests.py` pass when the server is running.
- **Frontend**: `npm run build` succeeds; dev server runs.
- **Test cases**: Documented on the Test Cases page and aligned with backend behavior (e.g. Issue credential → 200).
