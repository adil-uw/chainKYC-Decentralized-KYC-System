# How to run ChainKYC so Register On-Chain works

Do these steps **in order**, and use **two separate terminals**.  
The frontend proxies `/api` to the backend on **port 8000**, so the backend must run on 8000.

**Local MongoDB:** The app is set to use `mongodb://localhost:27017`. Ensure MongoDB is running (Windows: `MongoDB` service). Sample data was seeded; to re-seed run `python scripts/seed_data.py` from the `backend` folder.

---

## Terminal 1 — Backend

1. Open a terminal (PowerShell or Command Prompt).
2. Run:
   ```bash
   cd c:\Users\suzza\OneDrive\Desktop\chainKYC-Decentralized-KYC-System\backend
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
3. Leave it running. You should see: `Uvicorn running on http://127.0.0.1:8000`.

---

## Terminal 2 — Frontend

1. Open a **second** terminal.
2. Run:
   ```bash
   cd c:\Users\suzza\OneDrive\Desktop\chainKYC-Decentralized-KYC-System\frontend
   npm run dev
   ```
3. In the output, find the line like: `Local: http://localhost:3017/` (the port can be different).
4. Open that URL in your browser (e.g. http://localhost:3017).

---

## In the app

1. Go to **Provider Dashboard**.
2. Under “Credential pipeline”, enter a **Credential ID** (e.g. `cred_69b14110bcafc9ef53fca41e`) or use the link from a credential you issued.
3. Click **“3. Register on-chain (UC6)”** → **Go** to open the Register page.
4. Click **“Register On-Chain”**.

It should show success and the credential as registered.

---

## If the backend is not connected

- Start the **backend first** (Terminal 1) and wait until you see `Uvicorn running on http://127.0.0.1:8000`.
- Then start the **frontend** (Terminal 2). The frontend proxies `/api` to `http://localhost:8000`.
- If you see "Backend is not reachable", the backend is not running on port 8000. Start it with the command above.
- Make sure **only one** backend is running. Close any other terminals running `uvicorn`.
