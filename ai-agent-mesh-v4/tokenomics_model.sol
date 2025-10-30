// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title MeshTokenomics
 * @author AI-Agent Mesh Foundation
 * @notice Economic model implementation for the MESH token ecosystem
 * @dev Implements token utility, incentive mechanisms, and economic controls
 * 
 * Token Utility:
 * 1. Governance voting rights
 * 2. Compute credit payment
 * 3. Trust stake requirement
 * 4. Infrastructure node operation
 * 5. Transaction fee medium
 * 
 * Economic Mechanisms:
 * - Deflationary through fee burning
 * - Staking rewards (5% APY)
 * - Slashing for violations
 * - Liquidity mining incentives
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════
// MESH TOKEN ECONOMICS
// ═══════════════════════════════════════════════════════════════

contract MeshToken is ERC20, ERC20Burnable, ERC20Snapshot, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    
    // Token economics constants
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 400_000_000 * 10**18; // 40% at launch
    
    // Fee structure (basis points, 1 bp = 0.01%)
    uint256 public transactionFeeBps = 10; // 0.1%
    uint256 public constant MAX_FEE_BPS = 100; // 1% maximum
    
    // Fee distribution
    uint256 public burnPercentage = 50; // 50% of fees burned
    uint256 public treasuryPercentage = 30; // 30% to treasury
    uint256 public stakingPercentage = 20; // 20% to stakers
    
    // Addresses
    address public treasury;
    address public stakingPool;
    
    // Metrics
    uint256 public totalFeesCollected;
    uint256 public totalBurned;
    uint256 public totalStakingRewards;
    
    // Events
    event FeeCollected(address indexed from, address indexed to, uint256 amount, uint256 fee);
    event FeeBurned(uint256 amount);
    event TreasuryDeposit(uint256 amount);
    event StakingRewardDistributed(uint256 amount);
    event FeeStructureUpdated(uint256 transactionFeeBps, uint256 burnPct, uint256 treasuryPct, uint256 stakingPct);
    
    constructor(address _treasury, address _stakingPool) ERC20("Mesh Governance Token", "MESH") {
        require(_treasury != address(0), "Treasury address cannot be zero");
        require(_stakingPool != address(0), "Staking pool address cannot be zero");
        
        treasury = _treasury;
        stakingPool = _stakingPool;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(SNAPSHOT_ROLE, msg.sender);
        
        // Mint initial supply
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TOKEN TRANSFERS WITH FEES
    // ═══════════════════════════════════════════════════════════════
    
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        return _transferWithFee(msg.sender, to, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        return _transferWithFee(from, to, amount);
    }
    
    function _transferWithFee(address from, address to, uint256 amount) internal returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        
        // Fee exemptions
        if (_isExemptFromFees(from) || _isExemptFromFees(to)) {
            _transfer(from, to, amount);
            return true;
        }
        
        // Calculate fee
        uint256 fee = (amount * transactionFeeBps) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        // Transfer amount minus fee
        _transfer(from, to, amountAfterFee);
        
        // Distribute fee
        if (fee > 0) {
            _distributeFee(from, fee);
            totalFeesCollected += fee;
            emit FeeCollected(from, to, amount, fee);
        }
        
        return true;
    }
    
    function _distributeFee(address from, uint256 fee) internal {
        // Calculate distribution
        uint256 toBurn = (fee * burnPercentage) / 100;
        uint256 toTreasury = (fee * treasuryPercentage) / 100;
        uint256 toStaking = fee - toBurn - toTreasury; // Remainder to avoid rounding issues
        
        // Burn portion
        if (toBurn > 0) {
            _transfer(from, address(this), toBurn);
            _burn(address(this), toBurn);
            totalBurned += toBurn;
            emit FeeBurned(toBurn);
        }
        
        // Treasury portion
        if (toTreasury > 0) {
            _transfer(from, treasury, toTreasury);
            emit TreasuryDeposit(toTreasury);
        }
        
        // Staking rewards portion
        if (toStaking > 0) {
            _transfer(from, stakingPool, toStaking);
            totalStakingRewards += toStaking;
            emit StakingRewardDistributed(toStaking);
        }
    }
    
    function _isExemptFromFees(address account) internal view returns (bool) {
        return (
            account == treasury ||
            account == stakingPool ||
            account == address(this) ||
            hasRole(DEFAULT_ADMIN_ROLE, account)
        );
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TOKENOMICS MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    function updateFeeStructure(
        uint256 _transactionFeeBps,
        uint256 _burnPercentage,
        uint256 _treasuryPercentage,
        uint256 _stakingPercentage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_transactionFeeBps <= MAX_FEE_BPS, "Fee too high");
        require(_burnPercentage + _treasuryPercentage + _stakingPercentage == 100, "Percentages must sum to 100");
        
        transactionFeeBps = _transactionFeeBps;
        burnPercentage = _burnPercentage;
        treasuryPercentage = _treasuryPercentage;
        stakingPercentage = _stakingPercentage;
        
        emit FeeStructureUpdated(_transactionFeeBps, _burnPercentage, _treasuryPercentage, _stakingPercentage);
    }
    
    function updateTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newTreasury != address(0), "Invalid treasury address");
        treasury = _newTreasury;
    }
    
    function updateStakingPool(address _newStakingPool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newStakingPool != address(0), "Invalid staking pool address");
        stakingPool = _newStakingPool;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MINTING (Capped at MAX_SUPPLY)
    // ═══════════════════════════════════════════════════════════════
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
    }
    
    function burnFrom(address account, uint256 amount) public override onlyRole(BURNER_ROLE) {
        super.burnFrom(account, amount);
        totalBurned += amount;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // SNAPSHOTS (For governance voting)
    // ═══════════════════════════════════════════════════════════════
    
    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }
    
    // ═══════════════════════════════════════════════════════════════
    // METRICS
    // ═══════════════════════════════════════════════════════════════
    
    function getTokenomicsMetrics() external view returns (
        uint256 _totalSupply,
        uint256 _maxSupply,
        uint256 _circulatingSupply,
        uint256 _totalFeesCollected,
        uint256 _totalBurned,
        uint256 _totalStakingRewards,
        uint256 _burnRate
    ) {
        _totalSupply = totalSupply();
        _maxSupply = MAX_SUPPLY;
        _circulatingSupply = _totalSupply - balanceOf(treasury) - balanceOf(stakingPool);
        _totalFeesCollected = totalFeesCollected;
        _totalBurned = totalBurned;
        _totalStakingRewards = totalStakingRewards;
        _burnRate = _totalFeesCollected > 0 ? (_totalBurned * 10000) / _totalFeesCollected : 0; // Basis points
    }
    
    // ═══════════════════════════════════════════════════════════════
    // REQUIRED OVERRIDES
    // ═══════════════════════════════════════════════════════════════
    
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Snapshot)
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE CREDIT SYSTEM
// ═══════════════════════════════════════════════════════════════

contract ComputeCreditManager {
    MeshToken public meshToken;
    
    // Credit pricing
    uint256 public constant TOKENS_PER_COMPUTE_HOUR = 100 * 10**18; // 100 MESH = 1 hour
    
    // User compute credits
    mapping(address => uint256) public credits; // In seconds
    
    // Usage tracking
    mapping(address => uint256) public totalComputeUsed;
    uint256 public globalComputeUsed;
    
    event CreditsPurchased(address indexed user, uint256 meshAmount, uint256 creditSeconds);
    event CreditsUsed(address indexed user, uint256 seconds, string taskId);
    
    constructor(address _meshToken) {
        meshToken = MeshToken(_meshToken);
    }
    
    /**
     * @notice Purchase compute credits with MESH tokens
     * @param meshAmount Amount of MESH tokens to spend
     */
    function purchaseCredits(uint256 meshAmount) external {
        require(meshAmount >= TOKENS_PER_COMPUTE_HOUR, "Minimum 100 MESH required");
        
        // Transfer MESH to this contract
        require(meshToken.transferFrom(msg.sender, address(this), meshAmount), "Transfer failed");
        
        // Calculate credits (in seconds)
        uint256 creditSeconds = (meshAmount * 3600) / TOKENS_PER_COMPUTE_HOUR;
        
        credits[msg.sender] += creditSeconds;
        
        emit CreditsPurchased(msg.sender, meshAmount, creditSeconds);
    }
    
    /**
     * @notice Spend compute credits (called by mesh network)
     * @param user User consuming compute
     * @param seconds Compute time in seconds
     * @param taskId Task identifier
     */
    function spendCredits(address user, uint256 seconds, string memory taskId) external {
        require(credits[user] >= seconds, "Insufficient credits");
        
        credits[user] -= seconds;
        totalComputeUsed[user] += seconds;
        globalComputeUsed += seconds;
        
        emit CreditsUsed(user, seconds, taskId);
    }
    
    /**
     * @notice Check available credits
     */
    function getAvailableCredits(address user) external view returns (uint256 seconds, uint256 hours) {
        seconds = credits[user];
        hours = seconds / 3600;
    }
}

// ═══════════════════════════════════════════════════════════════
// LIQUIDITY MINING INCENTIVES
// ═══════════════════════════════════════════════════════════════

contract LiquidityMining {
    MeshToken public meshToken;
    
    // Reward pool
    uint256 public rewardPool;
    uint256 public rewardRatePerBlock; // MESH per block per LP token
    
    // LP token staking
    mapping(address => uint256) public lpStaked;
    mapping(address => uint256) public lastRewardBlock;
    mapping(address => uint256) public pendingRewards;
    
    uint256 public totalLpStaked;
    
    event LpStaked(address indexed user, uint256 amount);
    event LpUnstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    constructor(address _meshToken, uint256 _initialRewardPool) {
        meshToken = MeshToken(_meshToken);
        rewardPool = _initialRewardPool;
        rewardRatePerBlock = 10 * 10**18; // 10 MESH per block
    }
    
    function stakeLp(uint256 amount) external {
        _updateRewards(msg.sender);
        
        // In production: Transfer LP tokens from user
        // lpToken.transferFrom(msg.sender, address(this), amount);
        
        lpStaked[msg.sender] += amount;
        totalLpStaked += amount;
        
        emit LpStaked(msg.sender, amount);
    }
    
    function unstakeLp(uint256 amount) external {
        require(lpStaked[msg.sender] >= amount, "Insufficient staked LP");
        
        _updateRewards(msg.sender);
        
        lpStaked[msg.sender] -= amount;
        totalLpStaked -= amount;
        
        // In production: Transfer LP tokens back to user
        
        emit LpUnstaked(msg.sender, amount);
    }
    
    function claimRewards() external {
        _updateRewards(msg.sender);
        
        uint256 rewards = pendingRewards[msg.sender];
        require(rewards > 0, "No rewards to claim");
        require(rewardPool >= rewards, "Insufficient reward pool");
        
        pendingRewards[msg.sender] = 0;
        rewardPool -= rewards;
        
        require(meshToken.transfer(msg.sender, rewards), "Reward transfer failed");
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    function _updateRewards(address user) internal {
        if (lpStaked[user] > 0) {
            uint256 blocksSinceLastReward = block.number - lastRewardBlock[user];
            uint256 rewards = (lpStaked[user] * blocksSinceLastReward * rewardRatePerBlock) / totalLpStaked;
            pendingRewards[user] += rewards;
        }
        lastRewardBlock[user] = block.number;
    }
    
    function getPendingRewards(address user) external view returns (uint256) {
        if (lpStaked[user] == 0 || totalLpStaked == 0) return pendingRewards[user];
        
        uint256 blocksSinceLastReward = block.number - lastRewardBlock[user];
        uint256 newRewards = (lpStaked[user] * blocksSinceLastReward * rewardRatePerBlock) / totalLpStaked;
        
        return pendingRewards[user] + newRewards;
    }
}

// ═══════════════════════════════════════════════════════════════
// VESTING CONTRACT
// ═══════════════════════════════════════════════════════════════

contract TokenVesting {
    MeshToken public meshToken;
    
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 claimed;
    }
    
    mapping(address => VestingSchedule) public vestingSchedules;
    
    event VestingScheduleCreated(address indexed beneficiary, uint256 amount, uint256 startTime);
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    
    constructor(address _meshToken) {
        meshToken = MeshToken(_meshToken);
    }
    
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 cliffDuration,
        uint256 vestingDuration
    ) external {
        require(vestingSchedules[beneficiary].totalAmount == 0, "Schedule already exists");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            startTime: block.timestamp,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            claimed: 0
        });
        
        // Transfer tokens to vesting contract
        require(meshToken.transferFrom(msg.sender, address(this), totalAmount), "Transfer failed");
        
        emit VestingScheduleCreated(beneficiary, totalAmount, block.timestamp);
    }
    
    function claimVestedTokens() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");
        
        uint256 vested = _calculateVested(schedule);
        uint256 claimable = vested - schedule.claimed;
        
        require(claimable > 0, "No tokens to claim");
        
        schedule.claimed += claimable;
        
        require(meshToken.transfer(msg.sender, claimable), "Transfer failed");
        
        emit TokensClaimed(msg.sender, claimable);
    }
    
    function _calculateVested(VestingSchedule memory schedule) internal view returns (uint256) {
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }
        
        if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount;
        }
        
        uint256 timeSinceStart = block.timestamp - schedule.startTime;
        return (schedule.totalAmount * timeSinceStart) / schedule.vestingDuration;
    }
    
    function getClaimableAmount(address beneficiary) external view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        if (schedule.totalAmount == 0) return 0;
        
        uint256 vested = _calculateVested(schedule);
        return vested - schedule.claimed;
    }
}
