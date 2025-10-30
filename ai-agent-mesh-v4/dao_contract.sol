// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title MeshGovernanceDAO
 * @author AI-Agent Mesh Foundation
 * @notice Decentralized governance contract for the AI-Agent Mesh Network
 * @dev Implements token-weighted voting, proposal lifecycle, and treasury management
 * 
 * Features:
 * - Proposal creation and voting
 * - Treasury management
 * - Role-based access control
 * - Timelock for critical changes
 * - Emergency shutdown mechanism
 * 
 * Standards: OpenZeppelin Governor, ERC-20, ERC-721 (for NFT roles)
 */

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

// ═══════════════════════════════════════════════════════════════
// MESH GOVERNANCE TOKEN
// ═══════════════════════════════════════════════════════════════

contract MeshToken is ERC20, ERC20Votes {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    constructor() ERC20("Mesh Governance Token", "MESH") ERC20Permit("MESH") {
        // Initial distribution
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
    
    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }
    
    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}

// ═══════════════════════════════════════════════════════════════
// MESH GOVERNANCE DAO
// ═══════════════════════════════════════════════════════════════

contract MeshGovernanceDAO is 
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl 
{
    // ═══════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════
    
    enum ProposalCategory {
        PROTOCOL_UPGRADE,
        PARAMETER_ADJUSTMENT,
        TREASURY_ALLOCATION,
        ROLE_ASSIGNMENT,
        EMERGENCY_ACTION
    }
    
    struct ProposalMetadata {
        ProposalCategory category;
        string description;
        uint256 createdAt;
        address proposer;
        bool executed;
    }
    
    // Proposal ID => Metadata
    mapping(uint256 => ProposalMetadata) public proposalMetadata;
    
    // Role management
    mapping(address => bool) public coreMaintainers;
    mapping(address => bool) public complianceAuditors;
    mapping(address => bool) public disputeArbitrators;
    
    // Treasury tracking
    uint256 public treasuryBalance;
    
    // Emergency state
    bool public emergencyPause;
    address public emergencyCouncil;
    
    // Events
    event ProposalCreatedWithMetadata(
        uint256 proposalId,
        ProposalCategory category,
        string description,
        address proposer
    );
    
    event RoleAssigned(address indexed account, string role);
    event RoleRevoked(address indexed account, string role);
    event EmergencyPauseToggled(bool paused);
    event TreasuryWithdrawal(address indexed to, uint256 amount, string purpose);
    
    // ═══════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════
    
    constructor(
        IVotes _token,
        TimelockController _timelock
    )
        Governor("Mesh Governance DAO")
        GovernorSettings(
            7200,    // votingDelay: 1 day (assuming 12s blocks)
            50400,   // votingPeriod: 7 days
            100000e18 // proposalThreshold: 100,000 tokens
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(60) // 60% quorum
        GovernorTimelockControl(_timelock)
    {
        emergencyCouncil = msg.sender;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PROPOSAL CREATION
    // ═══════════════════════════════════════════════════════════════
    
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        ProposalCategory category
    ) public returns (uint256) {
        require(!emergencyPause, "DAO: Emergency pause active");
        
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        
        proposalMetadata[proposalId] = ProposalMetadata({
            category: category,
            description: description,
            createdAt: block.timestamp,
            proposer: msg.sender,
            executed: false
        });
        
        emit ProposalCreatedWithMetadata(proposalId, category, description, msg.sender);
        
        return proposalId;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // ROLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    function assignCoreMaintainer(address account) external onlyGovernance {
        coreMaintainers[account] = true;
        emit RoleAssigned(account, "Core Maintainer");
    }
    
    function revokeCoreMaintainer(address account) external onlyGovernance {
        coreMaintainers[account] = false;
        emit RoleRevoked(account, "Core Maintainer");
    }
    
    function assignComplianceAuditor(address account) external onlyGovernance {
        complianceAuditors[account] = true;
        emit RoleAssigned(account, "Compliance Auditor");
    }
    
    function revokeComplianceAuditor(address account) external onlyGovernance {
        complianceAuditors[account] = false;
        emit RoleRevoked(account, "Compliance Auditor");
    }
    
    function assignDisputeArbitrator(address account) external onlyGovernance {
        disputeArbitrators[account] = true;
        emit RoleAssigned(account, "Dispute Arbitrator");
    }
    
    function revokeDisputeArbitrator(address account) external onlyGovernance {
        disputeArbitrators[account] = false;
        emit RoleRevoked(account, "Dispute Arbitrator");
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TREASURY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    function depositToTreasury() external payable {
        treasuryBalance += msg.value;
    }
    
    function withdrawFromTreasury(
        address payable to,
        uint256 amount,
        string memory purpose
    ) external onlyGovernance {
        require(treasuryBalance >= amount, "DAO: Insufficient treasury balance");
        
        treasuryBalance -= amount;
        to.transfer(amount);
        
        emit TreasuryWithdrawal(to, amount, purpose);
    }
    
    function getTreasuryBalance() external view returns (uint256) {
        return treasuryBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // EMERGENCY CONTROLS
    // ═══════════════════════════════════════════════════════════════
    
    function toggleEmergencyPause() external {
        require(
            msg.sender == emergencyCouncil || coreMaintainers[msg.sender],
            "DAO: Not authorized for emergency actions"
        );
        
        emergencyPause = !emergencyPause;
        emit EmergencyPauseToggled(emergencyPause);
    }
    
    function setEmergencyCouncil(address newCouncil) external onlyGovernance {
        emergencyCouncil = newCouncil;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // OVERRIDES (Required by Solidity)
    // ═══════════════════════════════════════════════════════════════
    
    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }
    
    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }
    
    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }
    
    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }
    
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    )
        public
        override(Governor, IGovernor)
        returns (uint256)
    {
        return propose(targets, values, calldatas, description, ProposalCategory.PARAMETER_ADJUSTMENT);
    }
    
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }
    
    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
        proposalMetadata[proposalId].executed = true;
    }
    
    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }
    
    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// ═══════════════════════════════════════════════════════════════
// TRUST STAKE CONTRACT
// ═══════════════════════════════════════════════════════════════

contract TrustStakeManager {
    MeshToken public meshToken;
    
    struct Stake {
        uint256 amount;
        uint256 stakedAt;
        uint256 rewards;
        bool active;
    }
    
    mapping(address => Stake) public stakes;
    
    uint256 public constant MIN_STAKE = 100 * 10**18; // 100 MESH
    uint256 public constant REWARD_RATE = 5; // 5% APY
    
    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);
    event Slashed(address indexed staker, uint256 amount, string reason);
    event RewardsClaimed(address indexed staker, uint256 amount);
    
    constructor(address _meshToken) {
        meshToken = MeshToken(_meshToken);
    }
    
    function stake(uint256 amount) external {
        require(amount >= MIN_STAKE, "Stake: Below minimum");
        require(meshToken.transferFrom(msg.sender, address(this), amount), "Stake: Transfer failed");
        
        Stake storage userStake = stakes[msg.sender];
        
        if (userStake.active) {
            // Claim existing rewards before adding stake
            _claimRewards(msg.sender);
            userStake.amount += amount;
        } else {
            userStake.amount = amount;
            userStake.stakedAt = block.timestamp;
            userStake.active = true;
        }
        
        emit Staked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.active, "Stake: No active stake");
        require(userStake.amount >= amount, "Stake: Insufficient balance");
        
        // Claim rewards first
        _claimRewards(msg.sender);
        
        userStake.amount -= amount;
        
        if (userStake.amount == 0) {
            userStake.active = false;
        }
        
        require(meshToken.transfer(msg.sender, amount), "Stake: Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    function slash(address staker, uint256 amount, string memory reason) external {
        // Only DAO can slash
        require(msg.sender == address(meshToken), "Stake: Not authorized");
        
        Stake storage userStake = stakes[staker];
        require(userStake.active, "Stake: No active stake");
        
        uint256 slashAmount = amount > userStake.amount ? userStake.amount : amount;
        userStake.amount -= slashAmount;
        
        if (userStake.amount == 0) {
            userStake.active = false;
        }
        
        // Slashed funds go to treasury
        // In production: transfer to DAO treasury
        
        emit Slashed(staker, slashAmount, reason);
    }
    
    function claimRewards() external {
        _claimRewards(msg.sender);
    }
    
    function _claimRewards(address staker) internal {
        Stake storage userStake = stakes[staker];
        if (!userStake.active) return;
        
        uint256 timeStaked = block.timestamp - userStake.stakedAt;
        uint256 rewards = (userStake.amount * REWARD_RATE * timeStaked) / (365 days * 100);
        
        if (rewards > 0) {
            userStake.rewards += rewards;
            userStake.stakedAt = block.timestamp;
            
            // Mint rewards (in production, from reward pool)
            // meshToken.transfer(staker, rewards);
            
            emit RewardsClaimed(staker, rewards);
        }
    }
    
    function getStake(address staker) external view returns (uint256 amount, uint256 rewards) {
        Stake memory userStake = stakes[staker];
        return (userStake.amount, userStake.rewards);
    }
}

// ═══════════════════════════════════════════════════════════════
// ATTESTATION REGISTRY
// ═══════════════════════════════════════════════════════════════

contract AttestationRegistry {
    struct Attestation {
        address attester;
        address target;
        uint8 score;
        bytes32 evidenceHash;
        uint256 issuedAt;
        bool active;
    }
    
    mapping(bytes32 => Attestation) public attestations;
    mapping(address => bytes32[]) public attestationsByTarget;
    
    event AttestationRecorded(
        bytes32 indexed attestationId,
        address indexed attester,
        address indexed target,
        uint8 score
    );
    
    event AttestationRevoked(bytes32 indexed attestationId);
    
    function recordAttestation(
        address target,
        uint8 score,
        bytes32 evidenceHash
    ) external returns (bytes32) {
        require(score <= 100, "Attestation: Invalid score");
        
        bytes32 attestationId = keccak256(
            abi.encodePacked(msg.sender, target, block.timestamp)
        );
        
        attestations[attestationId] = Attestation({
            attester: msg.sender,
            target: target,
            score: score,
            evidenceHash: evidenceHash,
            issuedAt: block.timestamp,
            active: true
        });
        
        attestationsByTarget[target].push(attestationId);
        
        emit AttestationRecorded(attestationId, msg.sender, target, score);
        
        return attestationId;
    }
    
    function revokeAttestation(bytes32 attestationId) external {
        Attestation storage attestation = attestations[attestationId];
        require(attestation.attester == msg.sender, "Attestation: Not attester");
        require(attestation.active, "Attestation: Already revoked");
        
        attestation.active = false;
        
        emit AttestationRevoked(attestationId);
    }
    
    function getAttestations(address target) external view returns (bytes32[] memory) {
        return attestationsByTarget[target];
    }
}
