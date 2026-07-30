// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockRoleNFT {
    mapping(address => bool) public admins;
    mapping(address => bool) public hasRoleNFT;
    mapping(address => uint256) public userTokenId;
    mapping(uint256 => bool) public isShelterRole;
    mapping(address => bool) public authorizedDonationRecorders;
    mapping(address => uint256) public donorTotalContributed;

    uint256 private _nextTokenId;

    function setAdmin(address account, bool active) external {
        admins[account] = active;
    }

    function isAdmin(address account) external view returns (bool) {
        return admins[account];
    }

    function mintShelter(address shelter) external {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        hasRoleNFT[shelter] = true;
        userTokenId[shelter] = tokenId;
        isShelterRole[tokenId] = true;
    }

    function mintDonor(address donor) external {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        hasRoleNFT[donor] = true;
        userTokenId[donor] = tokenId;
    }

    function revoke(address user) external {
        uint256 tokenId = userTokenId[user];
        delete hasRoleNFT[user];
        delete userTokenId[user];
        delete isShelterRole[tokenId];
    }

    function authorizeDonationRecorder(
        address recorder,
        bool authorized
    ) external {
        authorizedDonationRecorders[recorder] = authorized;
    }

    function recordDonation(
        address donor,
        uint256 amount
    ) external returns (uint8) {
        require(authorizedDonationRecorders[msg.sender], "Only donation recorder");
        donorTotalContributed[donor] += amount;
        return 1;
    }
}
