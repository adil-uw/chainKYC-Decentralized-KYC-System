# ChainKYC — Live Demo Script

Use this script while giving a live demo. **[ACTION]** means do this on screen. Pause after each section if needed.

---

## 1. Introduction (30 seconds)

*"This is **ChainKYC** — a blockchain-based reusable KYC verification system. The idea is: verify identity once, then reuse that verification across services using a verifiable credential stored and checked on-chain."*

*"I’ll walk through the full flow: a user submits KYC, we approve it, link a wallet, issue a credential, sign it, register it on-chain, and then verify it. I’ll also show where revocation and status checks fit in."*

**[ACTION]** Dismiss the intro / Enter the app if the splash is showing.

---

## 2. Landing & Wallet (1 min)

*"On the landing page we have the main entry points: Start KYC, Check KYC Status, Connect Wallet, My Credentials, Verify Credential, and the Provider Dashboard."*

*"For a user who wants to hold credentials, they connect their wallet first. That wallet will later be linked to their approved KYC and will own the issued credential."*

**[ACTION]** Click **Connect MetaMask** (or show that it’s already connected). Point out the connected address.

*"Once connected, they can link this wallet to an approved KYC request from the Connect Wallet page. I’ll do that after we have an approved request."*

---

## 3. Submit KYC — User flow (1–2 min)

*"First, the user submits a KYC request."*

**[ACTION]** Go to **Start KYC** (or **Submit KYC**).

*"They enter full name, date of birth, address, email, and at least one ID — SSN or driver’s license. The backend validates that we have either SSN or driver license; both are optional in the form but at least one is required."*

**[ACTION]** Fill the form (e.g. name, DoB, address, email, SSN). Submit.

*"We get a KYC request ID back. In our setup, pending requests are auto-approved so we can demo the rest of the flow. In production, a provider would screen these manually or via rules."*

**[ACTION]** Copy or note the `kycRequestId` if you need it later. Go to **Check KYC Status** and enter that ID to show status **Approved**.

---

## 4. Connect Wallet — Link wallet to KYC (30 sec)

*"Now the user links their Ethereum wallet to this approved KYC request. That links their identity to the wallet that will hold the credential."*

**[ACTION]** Go to **Connect Wallet**. Enter the same `kycRequestId`. Click **Link wallet**. Confirm the wallet is linked.

*"This corresponds to the wallet-linking step: only approved requests can be linked, and the backend checks for duplicate wallet usage."*

---

## 5. Provider Dashboard & screening (1 min)

*"Switching to the **provider** side: the KYC provider sees all requests and can screen them, then run the credential pipeline."*

**[ACTION]** Go to **Provider Dashboard**.

*"The dashboard shows totals: total requests, pending, approved, rejected, and if the API returns them — issued credentials, on-chain count, revoked. We can open any request for screening."*

**[ACTION]** Click **View / Screen** on one request (e.g. the one you just approved).

*"On the screening page we can approve or reject. We already auto-approved this one; for a pending one we’d set Approve or Reject and optionally add a reason. Reject is used for blacklisted names, SSNs, or driver licenses."*

**[ACTION]** Briefly show the screening UI, then go back to the dashboard.

---

## 6. Credential pipeline — Use Cases 4, 5, 6 (2–3 min)

*"The credential pipeline is Use Cases 4, 5, and 6: Issue Credential, Hash & Sign, and Register on-chain."*

### Use Case 4 — Issue credential

*"First we **issue** a verifiable credential for an approved, wallet-linked request."*

**[ACTION]** From the dashboard click **1. Issue Credential (UC4)** (or use the **Issue Credential** button).

*"We select an approved KYC request that has a wallet linked. The backend creates a credential document with credentialId, issuer, subject wallet, identity verified, ID type, issued and expiry dates, and status."*

**[ACTION]** Select the request you approved and linked, click **Issue**. Note the `credentialId` (e.g. `cred_...`).

### Use Case 5 — Hash & Sign

*"Next we **hash and sign** that credential. The backend hashes a canonical representation of the credential with SHA-256 and signs it with the KYC provider’s key. That signature is what verifiers will check later."*

**[ACTION]** From the dashboard use **2. Hash & Sign (UC5)** and enter the `credentialId`, then **Go to Hash & Sign**. On the Hash & Sign page click **Hash & Sign**. Show the returned credential hash and signature.

### Use Case 6 — Register on-chain

*"Then we **register** the credential hash on-chain. The smart contract stores the hash and expiry so anyone can check whether a credential is registered and not revoked."*

**[ACTION]** Use **3. Register on-chain (UC6)** with the same `credentialId`, then **Go to Register on-chain**. Click **Register on-chain**. Show success and, if available, the transaction hash. *"In demo mode, if the chain isn’t configured, we still record registration in the database so verification can succeed."*

---

## 7. My Credentials — Use Cases 6A & 10 (30 sec)

*"Back on the **user** side: **My Credentials** lists credentials for the connected wallet. That’s Use Case 6A — retrieve credential by wallet — and Use Case 10 — list credentials for a user."*

**[ACTION]** Go to **My Credentials** (with the same wallet connected that you linked).

*"We see the issued credential. We can open it for details: credential ID, issuer, status, issued and expiry dates, and if we have it, the signature. This is what a user would share with a verifier — the credential JSON plus the signature."*

**[ACTION]** Open one credential and show the details (and signature if shown).

---

## 8. Verify Credential — Use Case 7 (1–2 min)

*"**Verify Credential** is Use Case 7. A verifier — for example a bank — receives the credential JSON and signature from the user and sends them to our verify API. The backend recomputes the hash, checks the issuer’s signature, and checks on-chain status: registered, revoked, expired."*

**[ACTION]** Go to **Verify Credential**.

*"We can paste the credential JSON and the signature. For a quick pass, we can use a credential we just issued and signed: copy the credential object and the signature from the Issue and Hash & Sign steps, or from the API. The doc **WHAT_TO_PASTE_TO_PASS.md** has an example pair that works with the current backend."*

**[ACTION]** Paste credential JSON in the first box and signature in the second. Click **Verify**.

*"The result shows: credential hash, whether the signature is valid, whether it’s registered on-chain, revoked, expired, and the overall verification status. For a valid credential we see **Signature: Valid** and **Verification status: valid**."*

**[ACTION]** Show the JSON result (and Copy/Download if you use it for grading).

---

## 9. Revocation & status — Use Cases 8 & 9 (optional, 1 min)

*"**Use Case 8** is revoking a credential. The provider can call the revoke endpoint with the credential ID; the backend updates the DB and, if the chain is configured, calls the contract to revoke the hash. After that, verification returns revoked true."*

*"**Use Case 9** is checking credential status — registered, revoked, expired — which we already see inside the Verify response and on the credential details page."*

**[ACTION]** Optionally go to Provider Dashboard → Credential pipeline, enter a credential ID, and open the Revoke flow from the app or mention that it’s under `/provider/revoke/:credentialId`. Show or mention that after revocation, Verify would show `revoked: true`.

---

## 10. Test cases reference (30 sec)

*"The app includes an **API Scenarios / Test Cases** page that lists the expected behavior for grading: KYC submission, screening, wallet linking, credential issuance, signing, on-chain registration, verification, and revocation. Each scenario has expected status codes and messages."*

**[ACTION]** In the nav, open **API Scenarios** (or go to `/test-cases`). Scroll through the categories.

*"All use cases 4 through 10 from the spec are implemented: Issue (4), Hash & Sign (5), Register on-chain (6), Retrieve by wallet (6A), Verify (7), Revoke (8), Check status (9), and List by wallet (10)."*

---

## 11. Closing (15 sec)

*"So we’ve shown: user submits KYC, provider approves and runs the pipeline — issue, sign, register — the user sees their credential in My Credentials, and a verifier can verify it with the credential plus signature. That’s the full ChainKYC flow. Questions?"*

---

## Quick checklist — All test-case areas covered

| Area              | Where in script | Use case / note                    |
|-------------------|-----------------|-------------------------------------|
| KYC submission     | §3              | Valid SSN/driver license, validation |
| KYC status         | §3              | Check status after submit           |
| Wallet linking     | §4              | Link wallet to approved request     |
| Provider dashboard | §5              | Stats, list, screening              |
| Screening          | §5              | Approve/reject, blacklist           |
| Issue credential   | §6              | **UC4** — issue for approved + linked |
| Hash & Sign        | §6              | **UC5** — hash + sign               |
| Register on-chain  | §6              | **UC6** — register hash             |
| My Credentials     | §7              | **UC6A, UC10** — by-wallet list     |
| Verify credential  | §8              | **UC7** — credential + signature    |
| Revocation         | §9              | **UC8** — revoke                    |
| Status check       | §8, §9          | **UC9** — in verify & details       |
| Test cases page    | §10             | All scenarios for grading           |

---

*Run backend: `cd backend && python -m uvicorn main:app --reload --port 8000`*  
*Run frontend: `cd frontend && npm run dev`*  
*Open the URL Vite prints (e.g. http://localhost:5173 or http://localhost:3003).*
