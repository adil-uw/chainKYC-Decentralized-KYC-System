"""
Minimal ABI for dKYCRegistry contract (Use Case 6).

Teammate's contract: smart-contract/src/dKYCRegistry.sol
TODO: After pulling teammate's work, replace this with the full ABI from the build
      artifact (e.g. smart-contract/artifacts/contracts/dKYCRegistry.sol/DKYCRegistry.json
      and load the "abi" key), or paste the full ABI list here.
"""

# Minimal ABI: only the functions we need for register flow.
# - isRegistered(bytes32) : check before registering
# - registerCredential(bytes32, uint64) : register hash on-chain
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
]
