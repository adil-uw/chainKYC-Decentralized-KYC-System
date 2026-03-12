# ChainKYC Frontend

Dark-theme React frontend for **ChainKYC: Blockchain-Based Reusable KYC Verification System**.

## Stack

- **React 18** + **Vite**
- **React Router** v6
- **Tailwind CSS**
- **Axios** for API
- **ethers.js** (v6) for MetaMask wallet connection
- **Zustand** for global state (intro dismissed, KYC request ID, wallet)
- **lucide-react** for icons

## Environment

Create a `.env` file (see `.env.example`):

```bash
# Backend API base URL (no trailing slash). Use empty or /api if using Vite proxy.
VITE_API_BASE_URL=http://localhost:8000
```

If the backend is on the same host, you can leave `VITE_API_BASE_URL` empty and rely on `vite.config.js` proxy: requests to `/api` will be forwarded to `http://localhost:8000`.

## Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

Build for production:

```bash
npm run build
npm run preview
```

## Frontend ↔ Backend Mapping

**Backend was not present in the repo when this frontend was created.** The app is built against the contract in `API_CONTRACT.md`. When the backend is available, update the following to match real routes and response shapes.

| Feature | Frontend usage | Expected backend (see API_CONTRACT.md) |
|--------|----------------|----------------------------------------|
| Submit KYC | `POST /api/kyc/requests` | Body: fullName, dateOfBirth, address, email, ssn/driverLicenseNumber, phoneNumber. Response: kycRequestId. |
| KYC status | `GET /api/kyc/requests/:id` | Response: kycRequestId, fullName, status, rejectionReason. |
| Link wallet | `POST /api/kyc/requests/:id/wallet` | Body: walletAddress. |
| List credentials | `GET /api/credentials?wallet=0x...` | Response: array of credentials. |
| Get credential | `GET /api/credentials/:id` | Response: full credential + signature, hash, timestamps. |
| Issue credential | `POST /api/credentials/issue` | Body: kycRequestId. |
| Sign credential | `POST /api/credentials/:id/sign` | Response: credentialHash, signature, signedAt. |
| Register on-chain | `POST /api/credentials/:id/register` | Response: transactionHash, registeredAt. |
| Revoke credential | `POST /api/credentials/:id/revoke` | Body (optional): reason. |
| Verify credential | `POST /api/credentials/verify` | Body: credential, signature. Response: signatureValid, registeredOnChain, revoked, expired, verificationStatus. |
| List KYC requests (provider) | `GET /api/kyc/requests` | Response: array of requests. |
| Screen KYC | `POST /api/kyc/requests/:id/screen` | Body: approved, reason (if reject). |
| Stats | `GET /api/stats` | Optional; totals for requests/credentials. |

Update `src/api/client.js` base URL and CORS if needed. Update `src/api/kyc.js`, `src/api/credentials.js`, and `src/api/provider.js` to use the exact paths and payload/response keys from your backend.

## Pages and integration status

| Page | Route | Integration |
|------|--------|-------------|
| Splash / Intro | (overlay) | Client-only; no API. |
| Landing | `/` | Client-only; links to other pages. |
| Submit KYC | `/submit-kyc` | **Integrated** — calls `POST /api/kyc/requests`; stores `kycRequestId` in session + Zustand. |
| KYC Status | `/kyc-status` | **Integrated** — `GET /api/kyc/requests/:id`; shows status, rejection reason, CTA to Connect Wallet. |
| Connect Wallet | `/connect-wallet` | **Integrated** — MetaMask + `POST .../wallet`; handles invalid address, not approved, already linked. |
| My Credentials | `/my-credentials` | **Integrated** — `GET /api/credentials?wallet=...`; list + link to details. |
| Credential Details | `/credentials/:id` | **Integrated** — `GET /api/credentials/:id`; copy hash/signature/JSON. |
| Verify Credential | `/verify` | **Integrated** — `POST /api/credentials/verify`; shows result card. |
| Provider Dashboard | `/provider` | **Integrated** — `GET /api/kyc/requests` (+ optional `GET /api/stats`); table + links to screen/issue. |
| KYC Screening | `/provider/screen/:id` | **Integrated** — GET request + `POST .../screen` approve/reject. |
| Issue Credential | `/provider/issue` | **Integrated** — list approved requests + `POST /api/credentials/issue`. |
| Sign Credential | `/provider/sign/:id` | **Integrated** — `POST /api/credentials/:id/sign`. |
| Register On-Chain | `/provider/register/:id` | **Integrated** — `POST /api/credentials/:id/register`. |
| Revoke Credential | `/provider/revoke/:id` | **Integrated** — `POST /api/credentials/:id/revoke` with optional reason + confirm modal. |
| API Scenarios | `/test-cases` | **Documentation** — lists expected success/error cases; no live API calls. |

All “Integrated” pages call the real API layer; behavior depends on the backend matching the contract. If the backend uses different paths or field names, update the API module and any component that reads response fields (e.g. `data.kycRequestId` vs `data.id`).

## Project structure

```
src/
  api/
    client.js      # Axios instance, base URL, error handling
    kyc.js         # submit, get, list, linkWallet, screen
    credentials.js # getByWallet, get, issue, sign, register, revoke, verify
    provider.js    # getStats (optional)
  lib/
    wallet.js      # connectWallet, getConnectedAddress, isValidEthereumAddress
  store/
    appStore.js    # Zustand: introDismissed, kycRequestId, walletAddress
  components/
    IntroLayer, Layout, StatusBadge, CopyButton, Toast, LoadingSpinner,
    FormField, WalletCard, Modal
  pages/
    Landing, SubmitKyc, KycStatus, ConnectWallet, MyCredentials,
    CredentialDetails, VerifyCredential, ProviderDashboard, KycScreening,
    IssueCredential, SignCredential, RegisterOnChain, RevokeCredential, TestCases
```

## Theming

Dark theme is implemented via Tailwind in `tailwind.config.js` and `src/index.css`:

- Background: `bg` (near-black), cards: `bg-card`, elevated: `bg-elevated`
- Accents: teal, cyan, blue
- Status: success (green), warning (amber), error (red), revoked (dark red)
