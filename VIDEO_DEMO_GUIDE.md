# ChainKYC — Complete Test Flow & Video Demo Guide

Use this guide to run the project and record a full demo video.

---

## Part 1: How to Run the Project

### Prerequisites
- **Node.js** (for frontend) — [nodejs.org](https://nodejs.org)
- **Python 3.10+** (for backend) — [python.org](https://python.org)
- **MongoDB** — use MongoDB Atlas (cloud) or local MongoDB. Connection string goes in `backend/.env`.
- **MetaMask** — browser extension for wallet: [metamask.io](https://metamask.io)
- **Backend `.env`** — create `backend/.env` with:
  ```
  MONGODB_URL=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
  ```
  (Use your real MongoDB Atlas URL or `mongodb://localhost:27017` for local.)

### Step 1: Install dependencies

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Start backend
In a terminal:
```bash
cd backend
uvicorn main:app --reload
```
Wait until you see: `Uvicorn running on http://127.0.0.1:8000`

### Step 3: Start frontend
In a **second** terminal:
```bash
cd frontend
npm run dev
```
Note the URL (e.g. `http://localhost:3000` or `http://localhost:3004`).

### Step 4: Open the app
In your browser, go to the frontend URL (e.g. **http://localhost:3004**). You should see the ChainKYC landing page with navigation.

---

## Part 2: Complete Test Flow (What to Do in the Video)

Follow this order to demonstrate the full flow.

---

### **Phase A: User — Submit KYC**

1. Go to **Home** (or stay on landing).
2. Click **Submit KYC** (or **Start KYC** on the home cards).
3. Fill the form:
   - **Full name:** e.g. John Doe  
   - **Date of birth:** any valid date  
   - **Address:** e.g. 123 Main St  
   - **Email:** e.g. john@example.com  
   - **SSN** or **Driver license:** e.g. 123-45-6789 (at least one required)
4. Click **Submit KYC**.
5. You should see a success message and be **redirected to KYC Status**. The new **KYC Request ID** is saved and shown.

*What to say:* “The user submits their KYC data. It’s stored off-chain in MongoDB and is auto-approved. No personal data goes on the blockchain.”

---

### **Phase B: User — Check Status & Connect Wallet**

6. On **KYC Status**, the request should show **Approved** (and the request ID in the input).
7. Click **Connect Wallet** (the green button).
8. On **Connect Wallet**:
   - If needed, click **Connect MetaMask** and approve in MetaMask.
   - The **KYC Request ID** should be pre-filled. If not, paste the ID from the status page.
   - Click **Link wallet to KYC**.
9. You should see “Wallet linked successfully.”

*What to say:* “The user checks status — it’s approved. They connect their Ethereum wallet (MetaMask) and link it to this KYC request so they can receive a verifiable credential later.”

---

### **Phase C: Provider — Issue & Sign Credential**

10. In the nav, go to **Provider Dashboard**.
11. You should see **KYC Requests** (your request listed) and stats (e.g. Approved count).
12. Click **Issue Credential**.
13. On **Issue Credential**:
    - Select your KYC request from the dropdown (or enter the KYC Request ID).
    - Click **Issue Credential**.
14. You should see the **Issued credential** card with a **Credential ID**. Click **Hash & Sign →** (or go to **Provider** and then the sign link).
15. On **Hash & Sign Credential**:
    - Click **Hash & Sign**.
    - You should see “Signed” with **Credential hash** and **Signature**. Click **Register On-Chain →**.

*What to say:* “The KYC provider issues a credential for the approved, wallet-linked request. Then they hash the credential and sign it with the provider’s key. Still off-chain.”

---

### **Phase D: Provider — Register On-Chain (Optional for demo)**

16. On **Register On-Chain**:
    - Click **Register On-Chain**.
    - This calls the smart contract. It requires the backend to have blockchain config (RPC URL, provider wallet, deployed contract). If you haven’t set that up, you can say: “In production, this step writes the credential hash to the blockchain so anyone can verify it without seeing the KYC data.”
    - If it works, you’ll see **Registered** and a transaction hash.

*What to say:* “Only the hash is registered on-chain — not the KYC data. Verifiers can check that the credential exists and is not revoked or expired.”

---

### **Phase E: User — My Credentials & Verify**

17. Go to **My Credentials**.
18. Enter the **wallet address** (the one you linked; it may be pre-filled if you connected in the header).
19. Click **Load**. You should see the credential(s) for that wallet.
20. Click **View Details** on a credential to see **Credential Details** (ID, status, hash, etc.).
21. Go to **Verify Credential**.
22. Paste the **Credential JSON** and **Signature** (you can get these from the credential-by-wallet API or from the provider flow). Click **Verify**.
23. You should see **Result** with signature valid, on-chain status, etc.

*What to say:* “The user can list their credentials by wallet and open details. On the Verify page, a verifier can paste a credential and signature and get a result: signature valid, registered on-chain, not revoked, not expired.”

---

### **Phase F: Optional — Revoke**

24. As provider, go to **Provider** → **Revoke** (or use the revoke link on a credential details page).
25. Enter the **Credential ID** (or open the revoke URL with the id). Confirm **Revoke**.
26. After that, **Verify Credential** for that credential should show revoked.

*What to say:* “The provider can revoke a credential on-chain so it’s no longer accepted by verifiers.”

---

## Part 3: Explanation of the Complete Run (For Your Narration)

### What the system is
**ChainKYC** is a **blockchain-based reusable KYC** system:
- **Off-chain:** KYC data (name, DOB, address, SSN/driver’s license) is stored only in the backend database (MongoDB). It never goes on the blockchain.
- **On-chain:** Only a **hash** of the issued credential is stored on the smart contract (dKYCRegistry). Verifiers can check that a credential is registered, not revoked, and not expired — without seeing the underlying KYC data.

### Flow in short
1. **User submits KYC** → Stored in DB, auto-approved.
2. **User links wallet** → Associates an Ethereum address with that approved request.
3. **Provider issues credential** → Builds a credential JSON, stores it in DB.
4. **Provider hashes and signs** → SHA-256 hash + signature with provider’s key (off-chain).
5. **Provider registers on-chain** → Only the hash + expiry are written to the contract.
6. **User / verifier** → Can list credentials by wallet and **verify** by sending credential + signature; backend checks signature and on-chain status.

### Tech stack (for the video)
- **Frontend:** React, Vite, Tailwind, React Router, Zustand, ethers.js (MetaMask), Axios.
- **Backend:** FastAPI, MongoDB (Motor), Python. Handles KYC CRUD, credential issue/sign, and blockchain calls (Web3).
- **Smart contract:** Solidity (dKYCRegistry) — register/revoke credential hashes, check validity.
- **Wallet:** MetaMask for connecting and linking the user’s address.

### Good closing lines for the video
- “So we’ve shown: submit KYC, link wallet, issue and sign credential, optionally register on-chain, and verify — with no raw KYC data ever touching the blockchain.”
- “The user gets one approved identity that can be reused across services; verifiers only see a valid/invalid result and on-chain status.”

---

## Quick Checklist Before Recording

- [ ] Backend running (`uvicorn main:app --reload`) and `backend/.env` has `MONGODB_URL`
- [ ] Frontend running (`npm run dev`) and you know the app URL
- [ ] MetaMask installed and one account available
- [ ] One run-through without recording to confirm all steps work
- [ ] If you demo **Register On-Chain**, ensure backend has blockchain config (RPC, private key, contract address); otherwise skip or describe it as “production step”

---

## One-Page Flow Summary

| Step | Who    | Page / Action                    | Result                          |
|------|--------|----------------------------------|---------------------------------|
| 1    | User   | Submit KYC → fill form, submit   | KYC Request ID, redirect to Status |
| 2    | User   | KYC Status → see Approved        | Link to Connect Wallet          |
| 3    | User   | Connect Wallet → connect MetaMask, link | Wallet linked to request    |
| 4    | Provider| Provider Dashboard → Issue Credential   | Credential ID                  |
| 5    | Provider| Hash & Sign Credential           | Hash + signature                |
| 6    | Provider| Register On-Chain (optional)     | Tx hash, on-chain registered    |
| 7    | User   | My Credentials → load by wallet  | List of credentials             |
| 8    | Verifier| Verify Credential → paste cred + sig | Valid/invalid + on-chain status |
| 9    | Provider| Revoke Credential (optional)      | Credential revoked on-chain     |

Use this for a smooth, complete run and a clear explanation in your video submission.
