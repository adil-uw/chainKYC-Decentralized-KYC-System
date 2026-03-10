// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Decentralized KYC Credential Registry
/// @notice Anchors credential hashes on-chain, manages issuer authorization,
///         revocation, expiry, and public verification.
/// @dev Raw KYC data is never stored on-chain. Only credential hashes and status metadata.
contract DecentralizedKYCCredentialRegistry {
    // =========================
    // Errors
    // =========================
    error NotAdmin();
    error NotAuthorizedIssuer();
    error ZeroAddress();
    error IssuerAlreadyAuthorized();
    error IssuerNotAuthorized();
    error CredentialAlreadyRegistered();
    error CredentialNotRegistered();
    error CredentialAlreadyRevoked();
    error InvalidExpiry();

    // =========================
    // Events
    // =========================
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    event CredentialRegistered(
        bytes32 indexed credentialHash,
        address indexed issuer,
        uint64 expiry
    );

    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed issuer,
        uint8 reasonCode,
        uint64 revokedAt
    );

    // =========================
    // Storage
    // =========================
    address public admin;

    mapping(address => bool) private authorizedIssuers;

    mapping(bytes32 => bool) private registered;
    mapping(bytes32 => bool) private revoked;
    mapping(bytes32 => uint64) private expiryOf;
    mapping(bytes32 => address) private issuerOf;

    // Optional compliance / audit metadata
    mapping(bytes32 => uint8) public revocationReason;
    mapping(bytes32 => uint64) public revokedAt;

    // =========================
    // Modifiers
    // =========================
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyIssuer() {
        if (!authorizedIssuers[msg.sender]) revert NotAuthorizedIssuer();
        _;
    }

    // =========================
    // Constructor
    // =========================
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert ZeroAddress();
        admin = initialAdmin;
    }

    // =========================
    // Admin / Governance
    // =========================

    /// @notice Add a trusted issuer who can register and revoke credentials.
    function addIssuer(address issuer) external onlyAdmin {
        if (issuer == address(0)) revert ZeroAddress();
        if (authorizedIssuers[issuer]) revert IssuerAlreadyAuthorized();

        authorizedIssuers[issuer] = true;
        emit IssuerAdded(issuer);
    }

    /// @notice Remove a trusted issuer.
    function removeIssuer(address issuer) external onlyAdmin {
        if (issuer == address(0)) revert ZeroAddress();
        if (!authorizedIssuers[issuer]) revert IssuerNotAuthorized();

        authorizedIssuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    /// @notice Check whether an address is an authorized issuer.
    function isIssuer(address issuer) external view returns (bool) {
        return authorizedIssuers[issuer];
    }

    /// @notice Transfer admin rights.
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        admin = newAdmin;
    }

    // =========================
    // Credential Registry
    // =========================

    /// @notice Register a verified KYC credential hash on-chain.
    /// @param credentialHash Hash of the off-chain credential JSON / payload.
    /// @param expiry Unix timestamp when the credential expires.
    function registerCredential(
        bytes32 credentialHash,
        uint64 expiry
    ) external onlyIssuer {
        if (registered[credentialHash]) revert CredentialAlreadyRegistered();
        if (expiry <= block.timestamp) revert InvalidExpiry();

        registered[credentialHash] = true;
        expiryOf[credentialHash] = expiry;
        issuerOf[credentialHash] = msg.sender;

        emit CredentialRegistered(credentialHash, msg.sender, expiry);
    }

    /// @notice Revoke a previously registered credential.
    /// @dev Only the original issuer can revoke its own credential.
    /// @param credentialHash Hash of the credential.
    /// @param reasonCode Optional reason code for revocation.
    function revokeCredential(
        bytes32 credentialHash,
        uint8 reasonCode
    ) external onlyIssuer {
        if (!registered[credentialHash]) revert CredentialNotRegistered();
        if (issuerOf[credentialHash] != msg.sender)
            revert NotAuthorizedIssuer();
        if (revoked[credentialHash]) revert CredentialAlreadyRevoked();

        revoked[credentialHash] = true;
        revocationReason[credentialHash] = reasonCode;
        revokedAt[credentialHash] = uint64(block.timestamp);

        emit CredentialRevoked(
            credentialHash,
            msg.sender,
            reasonCode,
            uint64(block.timestamp)
        );
    }

    // =========================
    // Public Verification
    // =========================

    /// @notice Returns whether the credential was registered.
    function isRegistered(bytes32 credentialHash) external view returns (bool) {
        return registered[credentialHash];
    }

    /// @notice Returns whether the credential was revoked.
    function isRevoked(bytes32 credentialHash) external view returns (bool) {
        return revoked[credentialHash];
    }

    /// @notice Returns the stored expiry timestamp.
    function getExpiry(bytes32 credentialHash) external view returns (uint64) {
        return expiryOf[credentialHash];
    }

    /// @notice Returns the issuer that registered the credential.
    function getIssuerOf(
        bytes32 credentialHash
    ) external view returns (address) {
        return issuerOf[credentialHash];
    }

    /// @notice Checks if a credential is currently valid.
    /// @dev Valid means: registered, not revoked, and not expired.
    function isValid(bytes32 credentialHash) public view returns (bool) {
        return
            registered[credentialHash] &&
            !revoked[credentialHash] &&
            expiryOf[credentialHash] > block.timestamp;
    }

    /// @notice Returns complete status info for frontend / verifier use.
    function getCredentialStatus(
        bytes32 credentialHash
    )
        external
        view
        returns (
            bool _registered,
            bool _revoked,
            uint64 _expiry,
            address _issuer
        )
    {
        _registered = registered[credentialHash];
        _revoked = revoked[credentialHash];
        _expiry = expiryOf[credentialHash];
        _issuer = issuerOf[credentialHash];
    }
}
