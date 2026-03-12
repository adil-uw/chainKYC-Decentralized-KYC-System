// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DecentralizedKYCCredentialRegistry} from "../src/dKYCRegistry.sol";

contract DecentralizedKYCCredentialRegistryTest is Test {
    DecentralizedKYCCredentialRegistry internal registry;

    address internal admin = address(0xA11CE);
    address internal newAdmin = address(0xB0B);
    address internal issuer = makeAddr("issuer");
    address internal issuer2 = makeAddr("issuer2");
    address internal outsider = makeAddr("outsider");

    bytes32 internal credentialHash = keccak256("credential-1");
    bytes32 internal credentialHash2 = keccak256("credential-2");
    uint64 internal expiry;

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

    function setUp() public {
        registry = new DecentralizedKYCCredentialRegistry(admin);
        expiry = uint64(block.timestamp + 30 days);
    }

    function testConstructorSetsAdmin() public view {
        assertEq(registry.admin(), admin);
    }

    function testConstructorRevertsOnZeroAdmin() public {
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.ZeroAddress.selector
        );
        new DecentralizedKYCCredentialRegistry(address(0));
    }

    function testAdminCanAddIssuer() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit IssuerAdded(issuer);
        registry.addIssuer(issuer);

        assertTrue(registry.isIssuer(issuer));
    }

    function testNonAdminCannotAddIssuer() public {
        vm.prank(outsider);
        vm.expectRevert(DecentralizedKYCCredentialRegistry.NotAdmin.selector);
        registry.addIssuer(issuer);
    }

    function testAddIssuerRevertsForZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.ZeroAddress.selector
        );
        registry.addIssuer(address(0));
    }

    function testAddIssuerRevertsIfAlreadyAuthorized() public {
        vm.startPrank(admin);
        registry.addIssuer(issuer);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.IssuerAlreadyAuthorized.selector
        );
        registry.addIssuer(issuer);
        vm.stopPrank();
    }

    function testAdminCanRemoveIssuer() public {
        vm.startPrank(admin);
        registry.addIssuer(issuer);
        vm.expectEmit(true, false, false, true);
        emit IssuerRemoved(issuer);
        registry.removeIssuer(issuer);
        vm.stopPrank();

        assertFalse(registry.isIssuer(issuer));
    }

    function testRemoveIssuerRevertsIfNotAuthorized() public {
        vm.prank(admin);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.IssuerNotAuthorized.selector
        );
        registry.removeIssuer(issuer);
    }

    function testAdminCanTransferAdmin() public {
        vm.prank(admin);
        registry.transferAdmin(newAdmin);

        assertEq(registry.admin(), newAdmin);
    }

    function testTransferAdminRevertsOnZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.ZeroAddress.selector
        );
        registry.transferAdmin(address(0));
    }

    function testNewAdminCanManageIssuersAfterTransfer() public {
        vm.prank(admin);
        registry.transferAdmin(newAdmin);

        vm.prank(newAdmin);
        registry.addIssuer(issuer);

        assertTrue(registry.isIssuer(issuer));
    }

    function testAuthorizedIssuerCanRegisterCredential() public {
        vm.prank(admin);
        registry.addIssuer(issuer);

        vm.prank(issuer);
        vm.expectEmit(true, true, false, true);
        emit CredentialRegistered(credentialHash, issuer, expiry);
        registry.registerCredential(credentialHash, expiry);

        assertTrue(registry.isRegistered(credentialHash));
        assertFalse(registry.isRevoked(credentialHash));
        assertEq(registry.getExpiry(credentialHash), expiry);
        assertEq(registry.getIssuerOf(credentialHash), issuer);
        assertTrue(registry.isValid(credentialHash));
    }

    function testNonIssuerCannotRegisterCredential() public {
        vm.prank(outsider);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.NotAuthorizedIssuer.selector
        );
        registry.registerCredential(credentialHash, expiry);
    }

    function testRegisterCredentialRevertsIfAlreadyRegistered() public {
        vm.prank(admin);
        registry.addIssuer(issuer);

        vm.startPrank(issuer);
        registry.registerCredential(credentialHash, expiry);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry
                .CredentialAlreadyRegistered
                .selector
        );
        registry.registerCredential(
            credentialHash,
            uint64(block.timestamp + 60 days)
        );
        vm.stopPrank();
    }

    function testRegisterCredentialRevertsForInvalidExpiry() public {
        vm.prank(admin);
        registry.addIssuer(issuer);

        vm.prank(issuer);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.InvalidExpiry.selector
        );
        registry.registerCredential(credentialHash, uint64(block.timestamp));
    }

    function testOriginalIssuerCanRevokeCredential() public {
        vm.prank(admin);
        registry.addIssuer(issuer);

        vm.prank(issuer);
        registry.registerCredential(credentialHash, expiry);

        vm.warp(block.timestamp + 1 hours);

        vm.prank(issuer);
        vm.expectEmit(true, true, false, true);
        emit CredentialRevoked(
            credentialHash,
            issuer,
            7,
            uint64(block.timestamp)
        );
        registry.revokeCredential(credentialHash, 7);

        assertTrue(registry.isRevoked(credentialHash));
        assertEq(registry.revocationReason(credentialHash), 7);
        assertEq(registry.revokedAt(credentialHash), uint64(block.timestamp));
        assertFalse(registry.isValid(credentialHash));
    }

    function testRevokeRevertsForUnregisteredCredential() public {
        vm.prank(admin);
        registry.addIssuer(issuer);

        vm.prank(issuer);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.CredentialNotRegistered.selector
        );
        registry.revokeCredential(credentialHash, 1);
    }

    function testDifferentIssuerCannotRevokeCredential() public {
        vm.startPrank(admin);
        registry.addIssuer(issuer);
        registry.addIssuer(issuer2);
        vm.stopPrank();

        vm.prank(issuer);
        registry.registerCredential(credentialHash, expiry);

        vm.prank(issuer2);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.NotAuthorizedIssuer.selector
        );
        registry.revokeCredential(credentialHash, 9);
    }

    function testRevokeRevertsIfAlreadyRevoked() public {
        vm.prank(admin);
        registry.addIssuer(issuer);

        vm.startPrank(issuer);
        registry.registerCredential(credentialHash, expiry);
        registry.revokeCredential(credentialHash, 1);
        vm.expectRevert(
            DecentralizedKYCCredentialRegistry.CredentialAlreadyRevoked.selector
        );
        registry.revokeCredential(credentialHash, 2);
        vm.stopPrank();
    }

    function testIsValidReturnsFalseAfterExpiry() public {
        vm.prank(admin);
        registry.addIssuer(issuer);

        uint64 shortExpiry = uint64(block.timestamp + 1 days);

        vm.prank(issuer);
        registry.registerCredential(credentialHash, shortExpiry);

        assertTrue(registry.isValid(credentialHash));

        vm.warp(block.timestamp + 2 days);
        assertFalse(registry.isValid(credentialHash));
    }

    function testGetCredentialStatusReturnsExpectedValues() public {
        vm.prank(admin);
        registry.addIssuer(issuer);

        vm.prank(issuer);
        registry.registerCredential(credentialHash2, expiry);

        (
            bool registered_,
            bool revoked_,
            uint64 expiry_,
            address issuer_
        ) = registry.getCredentialStatus(credentialHash2);

        assertTrue(registered_);
        assertFalse(revoked_);
        assertEq(expiry_, expiry);
        assertEq(issuer_, issuer);
    }

    function testUnknownCredentialStatusDefaults() public view {
        (
            bool registered_,
            bool revoked_,
            uint64 expiry_,
            address issuer_
        ) = registry.getCredentialStatus(bytes32(uint256(999)));

        assertFalse(registered_);
        assertFalse(revoked_);
        assertEq(expiry_, 0);
        assertEq(issuer_, address(0));
    }
}
