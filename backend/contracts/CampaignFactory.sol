// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./Campaign.sol";
import "./interfaces/IRoleNFT.sol";

contract CampaignFactory {
    uint256 public constant FLOW_VERSION = 3;

    IRoleNFT public immutable roleNFT;

    mapping(bytes32 => address) public campaignByKey;
    mapping(address => address[]) private _campaignsByShelter;
    address[] private _allCampaigns;

    event CampaignCreated(
        bytes32 indexed campaignKey,
        address indexed shelter,
        address indexed campaign,
        address admin,
        uint256 goal,
        uint256 deadline
    );

    modifier onlyAdmin() {
        require(roleNFT.isAdmin(msg.sender), "Only admin");
        _;
    }

    constructor(address roleNFTAddress) {
        require(roleNFTAddress != address(0), "RoleNFT required");
        roleNFT = IRoleNFT(roleNFTAddress);
    }

    function createApprovedCampaign(
        bytes32 campaignKey,
        address shelter,
        uint256 goalWei,
        uint256 deadline,
        uint16[] calldata milestonePercentages
    ) external onlyAdmin returns (address campaignAddress) {
        require(campaignKey != bytes32(0), "Campaign key required");
        require(campaignByKey[campaignKey] == address(0), "Campaign exists");
        require(_isVerifiedShelter(shelter), "Verified shelter required");

        Campaign campaign = new Campaign(
            address(this),
            address(roleNFT),
            campaignKey,
            shelter,
            msg.sender,
            goalWei,
            deadline,
            milestonePercentages
        );

        campaignAddress = address(campaign);
        try roleNFT.authorizeDonationRecorder(campaignAddress, true) {
        } catch {
            // Campaign creation should still work if recorder authorization is configured later.
        }

        campaignByKey[campaignKey] = campaignAddress;
        _campaignsByShelter[shelter].push(campaignAddress);
        _allCampaigns.push(campaignAddress);

        emit CampaignCreated(
            campaignKey,
            shelter,
            campaignAddress,
            msg.sender,
            goalWei,
            deadline
        );
    }

    function getCampaignsByShelter(
        address shelter
    ) external view returns (address[] memory) {
        return _campaignsByShelter[shelter];
    }

    function getAllCampaigns() external view returns (address[] memory) {
        return _allCampaigns;
    }

    function getCampaignCount() external view returns (uint256) {
        return _allCampaigns.length;
    }

    function isPlatformAdmin(address account) external view returns (bool) {
        return roleNFT.isAdmin(account);
    }

    function _isVerifiedShelter(
        address account
    ) private view returns (bool) {
        if (account == address(0) || !roleNFT.hasRoleNFT(account)) {
            return false;
        }

        uint256 tokenId = roleNFT.userTokenId(account);
        return roleNFT.isShelterRole(tokenId);
    }
}
