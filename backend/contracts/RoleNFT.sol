// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract RoleNFT {
    string public constant name = "PawChain RoleNFT";
    string public constant symbol = "PAWROLE";
    address public constant ADMIN_ONE = 0x6aFf4af1a3f45adBbEa5d64955387b2f809521A6;
    address public constant ADMIN_TWO = 0x0D900c6FeF62E96Aa8Cf5788170A516aC66f3776;

    enum DonorLevel {
        None,
        Normal,
        Bronze,
        Silver,
        Gold,
        Hero
    }

    uint256 private _nextTokenId;
    address public owner;

    uint8 public constant MAX_DONOR_SUPPLY = 50;
    uint8 public constant MAX_SHELTER_SUPPLY = 50;

    uint8 public donorSupply;
    uint8 public shelterSupply;
    // These count how many Donor and Shelter NFTs already exist.

    mapping(address => bool) public hasRoleNFT; //Checks whether a wallet already has a role badge.
    mapping(address => uint256) public userTokenId; //Stores which NFT token belongs to a wallet.
    mapping(uint256 => bool) public isShelterRole; //Stores whether a token is Shelter. If true, it is Shelter. If false, it is Donor.
    mapping(uint256 => DonorLevel) public donorLevelOf;
    mapping(uint256 => address) private _owners; 
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TokenURIUpdated(uint256 indexed tokenId, string tokenURI);
    event DonorLevelUpdated(address indexed user, uint256 indexed tokenId, DonorLevel level);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "Only admin");
        _;
    }

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Owner required");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Owner required");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function isAdmin(address account) public view returns (bool) {
        return account == owner || account == ADMIN_ONE || account == ADMIN_TWO;
    }

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "Zero address");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }

    //useful if later we want to show image/name/description of the NFT badge. The metadataCID is stored in IPFS and is passed in when the NFT is minted.
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        return _tokenURIs[tokenId];
    }

    //Authorized PawChain admins issue role badges through their connected wallet.
    function safeMintDonor(address to, string memory metadataCID) external onlyAdmin returns (uint256) {
        require(donorSupply < MAX_DONOR_SUPPLY, "Donor supply limit reached");
        uint256 tokenId = _mintRole(to, metadataCID);
        donorLevelOf[tokenId] = DonorLevel.Normal;
        donorSupply++;
        return tokenId;
    }
    function safeMintShelter(address to, string memory metadataCID) external onlyAdmin returns (uint256) {
        require(shelterSupply < MAX_SHELTER_SUPPLY, "Shelter supply limit reached");
        uint256 tokenId = _mintRole(to, metadataCID);
        isShelterRole[tokenId] = true;
        shelterSupply++;
        return tokenId;
    }

    function getUserRole(address user) external view returns (string memory) {
        if (!hasRoleNFT[user]) {
            return "No Role";
        }

        return isShelterRole[userTokenId[user]] ? "Shelter" : "Donor";
    }

    function revokeRoleNFT(address user) external onlyAdmin returns (uint256) {
        require(user != address(0), "Zero address");
        require(hasRoleNFT[user], "User does not own a RoleNFT");

        uint256 tokenId = userTokenId[user];

        if (isShelterRole[tokenId]) {
            shelterSupply--;
        } else {
            donorSupply--;
        }

        _balances[user]--;
        delete hasRoleNFT[user];
        delete userTokenId[user];
        delete _owners[tokenId];
        delete _tokenURIs[tokenId];
        delete isShelterRole[tokenId];
        delete donorLevelOf[tokenId];

        emit Transfer(user, address(0), tokenId);

        return tokenId;
    }

    function updateTokenURI(uint256 tokenId, string memory metadataCID) public onlyOwner {
        _updateTokenURI(tokenId, metadataCID);
    }

    function _updateTokenURI(uint256 tokenId, string memory metadataCID) internal {
        ownerOf(tokenId);
        _tokenURIs[tokenId] = _buildTokenURI(metadataCID);
        emit TokenURIUpdated(tokenId, _tokenURIs[tokenId]);
    }

    function upgradeDonorLevel(address donor, DonorLevel level, string memory metadataCID) external onlyAdmin {
        require(donor != address(0), "Zero address");
        require(hasRoleNFT[donor], "User does not own a RoleNFT");

        uint256 tokenId = userTokenId[donor];
        require(!isShelterRole[tokenId], "Shelter cannot have donor level");
        require(level != DonorLevel.None, "Invalid donor level");

        donorLevelOf[tokenId] = level;
        _updateTokenURI(tokenId, metadataCID);
        emit DonorLevelUpdated(donor, tokenId, level);
    }
// _mintRole is the helper that creates the NFT badge for the user wallet
    function _mintRole(address to, string memory metadataCID) private returns (uint256) {
        require(to != address(0), "Zero address");
        require(!hasRoleNFT[to], "User already owns a RoleNFT"); //one role NFT per wallet

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _owners[tokenId] = to;
        _balances[to]++;
        hasRoleNFT[to] = true;
        userTokenId[to] = tokenId;
        _tokenURIs[tokenId] = _buildTokenURI(metadataCID);

        emit Transfer(address(0), to, tokenId);

        return tokenId;
    }

    function _buildTokenURI(string memory metadataCID) private pure returns (string memory) {
        return string(abi.encodePacked("https://ipfs.io/ipfs/", metadataCID));
    }
}
