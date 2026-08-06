// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IRoleNFT.sol";

contract Campaign {
    uint16 public constant BASIS_POINTS = 10_000;
    uint16 public constant EMERGENCY_RELEASE_BPS = 500;
    uint256 public constant FLOW_VERSION = 3;

    enum CampaignStatus {
        Funding,
        Completed,
        Refunding,
        Cancelled
    }

    enum MilestoneStatus {
        Locked,
        Active,
        PendingReview,
        Rejected,
        Approved,
        Withdrawable,
        Released,
        Completed
    }

    struct Milestone {
        uint16 percentageBps;
        uint256 allocation;
        uint256 cumulativeThreshold;
        MilestoneStatus status;
        string proofCID;
    }

    address public immutable factory;
    IRoleNFT public immutable roleNFT;
    bytes32 public immutable campaignKey;
    address public immutable shelter;
    address public immutable createdByAdmin;
    uint256 public immutable goal;
    uint256 public immutable deadline;

    CampaignStatus public campaignStatus;
    uint256 public totalRaised;
    uint256 public totalReleased;
    uint256 public currentMilestoneIndex;
    uint256 public refundPool;
    uint256 public refundContributionBase;

    mapping(address => uint256) public donorContributions;
    mapping(uint256 => mapping(address => uint256))
        public milestoneContributions;
    mapping(uint256 => uint256) public milestoneTotalContributions;
    mapping(uint256 => bool) public milestoneFundsReleased;
    mapping(address => bool) public refundClaimed;
    Milestone[] private _milestones;

    uint256 private _reentrancyStatus = 1;

    event DonationReceived(
        bytes32 indexed campaignKey,
        address indexed donor,
        uint256 amount,
        uint256 totalRaised
    );
    event MilestoneDonationRecorded(
        uint256 indexed milestoneIndex,
        address indexed donor,
        uint256 amount
    );
    event MilestoneStatusChanged(
        uint256 indexed milestoneIndex,
        MilestoneStatus status
    );
    event MilestoneProofSubmitted(
        uint256 indexed milestoneIndex,
        string proofCID
    );
    event MilestoneRejected(uint256 indexed milestoneIndex);
    event FundsReleased(
        uint256 indexed milestoneIndex,
        address indexed shelter,
        uint256 amount
    );
    event RefundsEnabled(
        CampaignStatus status,
        uint256 refundPool,
        uint256 contributionBase
    );
    event RefundClaimed(address indexed donor, uint256 amount);
    event CampaignCompleted(bytes32 indexed campaignKey);

    modifier onlyAdmin() {
        require(roleNFT.isAdmin(msg.sender), "Only admin");
        _;
    }

    modifier onlyActiveShelter() {
        require(msg.sender == shelter, "Only shelter");
        require(_isVerifiedShelter(shelter), "Shelter role inactive");
        _;
    }

    modifier nonReentrant() {
        require(_reentrancyStatus == 1, "Reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    constructor(
        address factoryAddress,
        address roleNFTAddress,
        bytes32 supabaseCampaignKey,
        address shelterAddress,
        address adminAddress,
        uint256 goalWei,
        uint256 deadlineTimestamp,
        uint16[] memory milestonePercentages
    ) {
        require(factoryAddress != address(0), "Factory required");
        require(roleNFTAddress != address(0), "RoleNFT required");
        require(supabaseCampaignKey != bytes32(0), "Campaign key required");
        require(shelterAddress != address(0), "Shelter required");
        require(adminAddress != address(0), "Admin required");
        require(goalWei > 0, "Goal required");
        require(deadlineTimestamp > block.timestamp, "Future deadline required");
        require(
            milestonePercentages.length >= 2 &&
                milestonePercentages.length <= 5,
            "Use 2 to 5 milestones"
        );
        require(
            milestonePercentages[0] == EMERGENCY_RELEASE_BPS,
            "First milestone must be 5%"
        );

        factory = factoryAddress;
        roleNFT = IRoleNFT(roleNFTAddress);
        campaignKey = supabaseCampaignKey;
        shelter = shelterAddress;
        createdByAdmin = adminAddress;
        goal = goalWei;
        deadline = deadlineTimestamp;
        campaignStatus = CampaignStatus.Funding;

        uint256 totalPercentage;
        uint256 allocated;

        for (uint256 index = 0; index < milestonePercentages.length; index++) {
            uint16 percentage = milestonePercentages[index];
            require(percentage > 0, "Milestone percentage required");
            totalPercentage += percentage;

            uint256 allocation = index == milestonePercentages.length - 1
                ? goalWei - allocated
                : (goalWei * percentage) / BASIS_POINTS;
            allocated += allocation;

            _milestones.push(
                Milestone({
                    percentageBps: percentage,
                    allocation: allocation,
                    cumulativeThreshold: allocated,
                    status: index == 0
                        ? MilestoneStatus.Active
                        : MilestoneStatus.Locked,
                    proofCID: ""
                })
            );
        }

        require(totalPercentage == BASIS_POINTS, "Milestones must total 100%");
    }

    function donate() external payable {
        require(campaignStatus == CampaignStatus.Funding, "Not funding");
        require(_isVerifiedShelter(shelter), "Shelter role inactive");
        require(block.timestamp < deadline, "Campaign expired");
        require(msg.value > 0, "Donation required");

        Milestone storage milestone = _milestones[currentMilestoneIndex];
        require(
            milestone.status == MilestoneStatus.Active,
            "Current milestone not accepting donations"
        );
        require(
            totalRaised + msg.value <= milestone.cumulativeThreshold,
            "Donation exceeds current milestone target"
        );

        donorContributions[msg.sender] += msg.value;
        milestoneContributions[currentMilestoneIndex][msg.sender] += msg.value;
        milestoneTotalContributions[currentMilestoneIndex] += msg.value;
        totalRaised += msg.value;

        try roleNFT.recordDonation(msg.sender, msg.value) {
        } catch {
            // Donation should not fail if badge recording is not configured yet.
        }

        _refreshCurrentMilestone();

        emit DonationReceived(
            campaignKey,
            msg.sender,
            msg.value,
            totalRaised
        );
        emit MilestoneDonationRecorded(
            currentMilestoneIndex,
            msg.sender,
            msg.value
        );
    }

    function submitMilestoneProof(
        uint256 milestoneIndex,
        string calldata proofCID
    ) external onlyActiveShelter {
        require(campaignStatus == CampaignStatus.Funding, "Campaign not active");
        require(milestoneIndex == currentMilestoneIndex, "Not current milestone");
        require(bytes(proofCID).length > 0, "Proof CID required");

        Milestone storage milestone = _milestones[milestoneIndex];

        require(
            milestone.status == MilestoneStatus.Released ||
                milestone.status == MilestoneStatus.Rejected,
            "Milestone funds must be withdrawn first"
        );

        milestone.proofCID = proofCID;
        milestone.status = MilestoneStatus.PendingReview;

        emit MilestoneProofSubmitted(milestoneIndex, proofCID);
        emit MilestoneStatusChanged(
            milestoneIndex,
            MilestoneStatus.PendingReview
        );
    }

    function approveMilestone(uint256 milestoneIndex) external onlyAdmin {
        require(campaignStatus == CampaignStatus.Funding, "Campaign not active");
        require(milestoneIndex == currentMilestoneIndex, "Not current milestone");

        Milestone storage milestone = _milestones[milestoneIndex];
        require(
            milestone.status == MilestoneStatus.PendingReview,
            "Proof not pending"
        );

        milestone.status = MilestoneStatus.Completed;
        emit MilestoneStatusChanged(
            milestoneIndex,
            MilestoneStatus.Completed
        );
        _activateNextMilestone();
    }

    function rejectMilestone(uint256 milestoneIndex) external onlyAdmin {
        require(campaignStatus == CampaignStatus.Funding, "Campaign not active");
        require(milestoneIndex == currentMilestoneIndex, "Not current milestone");

        Milestone storage milestone = _milestones[milestoneIndex];
        require(
            milestone.status == MilestoneStatus.PendingReview,
            "Proof not pending"
        );

        milestone.status = MilestoneStatus.Rejected;
        emit MilestoneRejected(milestoneIndex);
        emit MilestoneStatusChanged(milestoneIndex, MilestoneStatus.Rejected);
    }

    function withdrawMilestone(
        uint256 milestoneIndex
    ) external onlyActiveShelter nonReentrant {
        require(campaignStatus == CampaignStatus.Funding, "Campaign not active");
        require(milestoneIndex == currentMilestoneIndex, "Not current milestone");

        Milestone storage milestone = _milestones[milestoneIndex];
        require(
            milestone.status == MilestoneStatus.Withdrawable,
            "Funds not withdrawable"
        );

        uint256 amount = milestone.allocation;
        require(address(this).balance >= amount, "Insufficient contract balance");

        totalReleased += amount;
        milestoneFundsReleased[milestoneIndex] = true;
        milestone.status = MilestoneStatus.Released;

        (bool sent, ) = payable(shelter).call{value: amount}("");
        require(sent, "Fund transfer failed");

        emit FundsReleased(milestoneIndex, shelter, amount);
        emit MilestoneStatusChanged(milestoneIndex, milestone.status);

    }

    function finalizeExpired() external {
        require(campaignStatus == CampaignStatus.Funding, "Campaign not active");
        require(block.timestamp >= deadline, "Campaign not expired");
        require(totalRaised < goal, "Campaign reached goal");
        _enableRefunds(CampaignStatus.Refunding);
    }

    function cancelCampaign() external onlyAdmin {
        require(campaignStatus == CampaignStatus.Funding, "Campaign not active");
        _enableRefunds(CampaignStatus.Cancelled);
    }

    function claimRefund() external nonReentrant {
        require(
            campaignStatus == CampaignStatus.Refunding ||
                campaignStatus == CampaignStatus.Cancelled,
            "Refunds unavailable"
        );
        require(!refundClaimed[msg.sender], "Refund already claimed");

        uint256 amount = _refundableAmount(msg.sender);
        require(amount > 0, "No refundable balance");
        require(address(this).balance >= amount, "Insufficient refund balance");

        refundClaimed[msg.sender] = true;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Refund transfer failed");

        emit RefundClaimed(msg.sender, amount);
    }

    function getMilestoneCount() external view returns (uint256) {
        return _milestones.length;
    }

    function getMilestone(
        uint256 milestoneIndex
    ) external view returns (Milestone memory) {
        require(milestoneIndex < _milestones.length, "Invalid milestone");
        return _milestones[milestoneIndex];
    }

    function getRefundableAmount(
        address donor
    ) external view returns (uint256) {
        if (
            (campaignStatus != CampaignStatus.Refunding &&
                campaignStatus != CampaignStatus.Cancelled) ||
            refundClaimed[donor]
        ) {
            return 0;
        }

        return _refundableAmount(donor);
    }

    function _refreshCurrentMilestone() private {
        Milestone storage milestone = _milestones[currentMilestoneIndex];

        if (
            totalRaised >= milestone.cumulativeThreshold &&
            milestone.status == MilestoneStatus.Active
        ) {
            milestone.status = MilestoneStatus.Withdrawable;
            emit MilestoneStatusChanged(
                currentMilestoneIndex,
                MilestoneStatus.Withdrawable
            );
        }
    }

    function _activateNextMilestone() private {
        if (currentMilestoneIndex == _milestones.length - 1) {
            campaignStatus = CampaignStatus.Completed;
            emit CampaignCompleted(campaignKey);
            return;
        }

        currentMilestoneIndex++;
        Milestone storage nextMilestone = _milestones[currentMilestoneIndex];
        nextMilestone.status = MilestoneStatus.Active;
        emit MilestoneStatusChanged(
            currentMilestoneIndex,
            MilestoneStatus.Active
        );
    }

    function _enableRefunds(CampaignStatus nextStatus) private {
        uint256 balance = address(this).balance;

        campaignStatus = nextStatus;
        refundPool = balance;
        refundContributionBase = _refundableContributionBase();

        emit RefundsEnabled(nextStatus, balance, refundContributionBase);
    }

    function _refundableAmount(
        address donor
    ) private view returns (uint256 amount) {
        for (uint256 index = 0; index < _milestones.length; index++) {
            if (!milestoneFundsReleased[index]) {
                amount += milestoneContributions[index][donor];
            }
        }
    }

    function _refundableContributionBase()
        private
        view
        returns (uint256 amount)
    {
        for (uint256 index = 0; index < _milestones.length; index++) {
            if (!milestoneFundsReleased[index]) {
                amount += milestoneTotalContributions[index];
            }
        }
    }

    function _isVerifiedShelter(
        address account
    ) private view returns (bool) {
        if (!roleNFT.hasRoleNFT(account)) {
            return false;
        }

        uint256 tokenId = roleNFT.userTokenId(account);
        return roleNFT.isShelterRole(tokenId);
    }
}
