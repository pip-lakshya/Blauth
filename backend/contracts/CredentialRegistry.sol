// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CredentialRegistry {
    struct Credential {
        address walletAddress;
        uint256 registeredAt;
        bool revoked;
        bool exists;
    }

    mapping(bytes32 => Credential) private credentials;

    event CredentialRegistered(bytes32 indexed credentialHash, address indexed walletAddress, uint256 registeredAt);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed walletAddress, uint256 revokedAt);

    function registerCredential(bytes32 credentialHash) external {
        require(!credentials[credentialHash].exists, "Credential already registered");

        credentials[credentialHash] = Credential({
            walletAddress: msg.sender,
            registeredAt: block.timestamp,
            revoked: false,
            exists: true
        });

        emit CredentialRegistered(credentialHash, msg.sender, block.timestamp);
    }

    function getCredential(bytes32 credentialHash)
        external
        view
        returns (address walletAddress, uint256 registeredAt, bool revoked)
    {
        Credential memory credential = credentials[credentialHash];
        require(credential.exists, "Credential not registered");
        return (credential.walletAddress, credential.registeredAt, credential.revoked);
    }

    function isCredentialRegistered(bytes32 credentialHash) external view returns (bool) {
        return credentials[credentialHash].exists;
    }

    function revokeCredential(bytes32 credentialHash) external {
        Credential storage credential = credentials[credentialHash];
        require(credential.exists, "Credential not registered");
        require(credential.walletAddress == msg.sender, "Only registering wallet can revoke");
        require(!credential.revoked, "Credential already revoked");

        credential.revoked = true;
        emit CredentialRevoked(credentialHash, msg.sender, block.timestamp);
    }
}
