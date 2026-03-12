"""
ABI for DecentralizedKYCCredentialRegistry (Use Cases 6, 7, 8).

Contract: smart-contract/src/dKYCRegistry.sol (DecentralizedKYCCredentialRegistry).
- Use Case 6: isRegistered(bytes32), registerCredential(bytes32, uint64).
- Use Case 7: getCredentialStatus(bytes32) for verify.
- Use Case 8: revokeCredential(bytes32, uint8) for revoke.
"""

DKYC_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "bytes32", "name": "credentialHash", "type": "bytes32"}],
        "name": "isRegistered",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "credentialHash", "type": "bytes32"},
            {"internalType": "uint64", "name": "expiry", "type": "uint64"},
        ],
        "name": "registerCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "credentialHash", "type": "bytes32"}],
        "name": "getCredentialStatus",
        "outputs": [
            {"internalType": "bool", "name": "_registered", "type": "bool"},
            {"internalType": "bool", "name": "_revoked", "type": "bool"},
            {"internalType": "uint64", "name": "_expiry", "type": "uint64"},
            {"internalType": "address", "name": "_issuer", "type": "address"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "credentialHash", "type": "bytes32"},
            {"internalType": "uint8", "name": "reasonCode", "type": "uint8"},
        ],
        "name": "revokeCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]
