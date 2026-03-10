/**
 * API Scenarios / Test Cases panel for demo and grading.
 * Uses actual backend response shapes where backend exists; otherwise documents expected behavior.
 */
const scenarios = [
  {
    category: 'KYC submission',
    cases: [
      { title: 'Valid with SSN only', input: 'fullName, DoB, address, email, ssn', expectedStatus: 201, expectedMessage: 'kycRequestId returned', badge: 'success' },
      { title: 'Valid with driver license only', input: 'fullName, DoB, address, email, driverLicenseNumber', expectedStatus: 201, expectedMessage: 'kycRequestId returned', badge: 'success' },
      { title: 'Valid with both SSN and driver license', input: 'All required + both id fields', expectedStatus: 201, expectedMessage: 'kycRequestId returned', badge: 'success' },
      { title: 'Invalid — neither SSN nor driver license', input: 'Missing both id proof fields', expectedStatus: 400, expectedMessage: 'Validation error', badge: 'error' },
      { title: 'Missing required fields', input: 'e.g. missing fullName', expectedStatus: 400, expectedMessage: 'Validation error', badge: 'error' },
      { title: 'Duplicate active request', input: 'Same user, existing pending/approved', expectedStatus: 409, expectedMessage: 'Duplicate active request', badge: 'warning' },
      { title: 'Server/database failure', input: 'Backend down or DB error', expectedStatus: 500, expectedMessage: 'Internal error', badge: 'error' },
    ],
  },
  {
    category: 'Screening',
    cases: [
      { title: 'Approve request', input: 'approved: true', expectedStatus: 200, expectedMessage: 'Status updated to approved', badge: 'success' },
      { title: 'Reject — blacklisted name', input: 'approved: false, reason', expectedStatus: 200, expectedMessage: 'Rejected', badge: 'success' },
      { title: 'Reject — blacklisted SSN', input: 'approved: false, reason', expectedStatus: 200, expectedMessage: 'Rejected', badge: 'success' },
      { title: 'Reject — blacklisted driver license', input: 'approved: false, reason', expectedStatus: 200, expectedMessage: 'Rejected', badge: 'success' },
      { title: 'Already processed', input: 'Screen again', expectedStatus: 400, expectedMessage: 'Already processed', badge: 'warning' },
      { title: 'Request not found', input: 'Invalid kycRequestId', expectedStatus: 404, expectedMessage: 'Not found', badge: 'error' },
    ],
  },
  {
    category: 'Wallet linking',
    cases: [
      { title: 'Successful wallet linking', input: 'Valid address, approved request', expectedStatus: 200, expectedMessage: 'Wallet linked', badge: 'success' },
      { title: 'Invalid wallet address', input: 'Malformed address', expectedStatus: 400, expectedMessage: 'Invalid address', badge: 'error' },
      { title: 'Request not approved', input: 'Pending/rejected request', expectedStatus: 403, expectedMessage: 'Not approved', badge: 'error' },
      { title: 'Wallet already linked elsewhere', input: 'Address used for another request', expectedStatus: 409, expectedMessage: 'Already linked', badge: 'warning' },
      { title: 'Request not found', input: 'Invalid kycRequestId', expectedStatus: 404, expectedMessage: 'Not found', badge: 'error' },
    ],
  },
  {
    category: 'Credential issuance',
    cases: [
      { title: 'Issue credential', input: 'kycRequestId (approved, wallet linked)', expectedStatus: 201, expectedMessage: 'credentialId, issuer, issuedAt, expiry', badge: 'success' },
      { title: 'Request not found', input: 'Invalid kycRequestId', expectedStatus: 404, expectedMessage: 'Not found', badge: 'error' },
      { title: 'Not approved', input: 'Pending/rejected request', expectedStatus: 403, expectedMessage: 'Not approved', badge: 'error' },
      { title: 'Wallet not linked', input: 'Approved but no wallet', expectedStatus: 400, expectedMessage: 'Wallet not linked', badge: 'error' },
      { title: 'Duplicate credential / invalid state', input: 'Already issued for request', expectedStatus: 409, expectedMessage: 'Already issued', badge: 'warning' },
    ],
  },
  {
    category: 'Signing',
    cases: [
      { title: 'Hash & sign credential', input: 'credentialId', expectedStatus: 200, expectedMessage: 'credentialHash, signature, signedAt', badge: 'success' },
      { title: 'Credential not found', input: 'Invalid credentialId', expectedStatus: 404, expectedMessage: 'Not found', badge: 'error' },
      { title: 'Invalid state', input: 'e.g. already signed', expectedStatus: 400, expectedMessage: 'Invalid state', badge: 'warning' },
      { title: 'Signing failure', input: 'Backend error', expectedStatus: 500, expectedMessage: 'Signing failed', badge: 'error' },
    ],
  },
  {
    category: 'On-chain registration',
    cases: [
      { title: 'Register on-chain', input: 'credentialId', expectedStatus: 200, expectedMessage: 'transactionHash, registeredAt', badge: 'success' },
      { title: 'Not found', input: 'Invalid credentialId', expectedStatus: 404, expectedMessage: 'Not found', badge: 'error' },
      { title: 'Already registered', input: 'Credential already on-chain', expectedStatus: 409, expectedMessage: 'Already registered', badge: 'warning' },
      { title: 'Blockchain failure', input: 'RPC/network error', expectedStatus: 502, expectedMessage: 'Blockchain error', badge: 'error' },
    ],
  },
  {
    category: 'Verification',
    cases: [
      { title: 'Valid credential', input: 'Valid JSON + signature', expectedStatus: 200, expectedMessage: 'signatureValid, registeredOnChain, verificationStatus', badge: 'success' },
      { title: 'Invalid signature', input: 'Tampered credential or wrong sig', expectedStatus: 200, expectedMessage: 'signatureValid: false', badge: 'error' },
      { title: 'Not registered on chain', input: 'Unregistered credential', expectedStatus: 200, expectedMessage: 'registeredOnChain: false', badge: 'warning' },
      { title: 'Revoked', input: 'Revoked credential', expectedStatus: 200, expectedMessage: 'revoked: true', badge: 'error' },
      { title: 'Expired', input: 'Expired credential', expectedStatus: 200, expectedMessage: 'expired: true', badge: 'warning' },
      { title: 'Missing payload', input: 'No credential body', expectedStatus: 400, expectedMessage: 'Validation error', badge: 'error' },
    ],
  },
  {
    category: 'Revocation',
    cases: [
      { title: 'Revoke credential', input: 'credentialId, optional reason', expectedStatus: 200, expectedMessage: 'revoked, revokedAt, revocationReason', badge: 'success' },
      { title: 'Not found', input: 'Invalid credentialId', expectedStatus: 404, expectedMessage: 'Not found', badge: 'error' },
      { title: 'Already revoked', input: 'Already revoked credential', expectedStatus: 400, expectedMessage: 'Already revoked', badge: 'warning' },
      { title: 'Not eligible', input: 'Invalid state for revocation', expectedStatus: 400, expectedMessage: 'Not eligible', badge: 'error' },
      { title: 'Blockchain failure', input: 'On-chain revoke fails', expectedStatus: 502, expectedMessage: 'Blockchain error', badge: 'error' },
    ],
  },
];

function Badge({ variant }) {
  const cls =
    variant === 'success' ? 'bg-status-success/20 text-green-400 border-status-success/40' :
    variant === 'error' ? 'bg-status-error/20 text-red-400 border-status-error/40' :
    'bg-amber-500/20 text-amber-400 border-amber-500/40';
  return <span className={`badge border ${cls}`}>{variant}</span>;
}

export default function TestCases() {
  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">API Scenarios / Test Cases</h1>
      <p className="text-gray-400 mb-8 text-sm">
        Expected success and error scenarios aligned with backend contract. Use for demo and grading.
      </p>

      <div className="space-y-8">
        {scenarios.map(({ category, cases }) => (
          <div key={category} className="card">
            <h2 className="text-lg font-semibold text-gray-100 mb-4 border-b border-border pb-2">
              {category}
            </h2>
            <div className="space-y-3">
              {cases.map((c, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-bg-muted border border-border flex flex-wrap items-center gap-3"
                >
                  <span className="font-medium text-gray-200 w-full sm:w-auto">{c.title}</span>
                  <Badge variant={c.badge} />
                  <span className="text-xs text-gray-500 w-full sm:w-auto">Input: {c.input}</span>
                  <span className="text-xs text-gray-400">
                    {c.expectedStatus} — {c.expectedMessage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
