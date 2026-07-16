// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRoleNFT {
    function isAdmin(address account) external view returns (bool);
    function hasRoleNFT(address account) external view returns (bool);
    function userTokenId(address account) external view returns (uint256);
    function isShelterRole(uint256 tokenId) external view returns (bool);
}
