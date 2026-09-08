// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

contract GiftEscrow {
    address public owner;

    struct Gift {
        address token;
        uint256 amount;
        address sender;
        uint256 releaseAt;   // 0 = instant, otherwise scheduled unix timestamp
        uint256 depositedAt; // when deposit was made
        bool released;
        bool refunded;
    }

    mapping(bytes32 => Gift) public gifts;

    event Deposited(bytes32 indexed giftId, address indexed sender, address token, uint256 amount);
    event Released(bytes32 indexed giftId, address indexed recipient);
    event Refunded(bytes32 indexed giftId, address indexed sender);

    error Unauthorized();
    error AlreadyDeposited();
    error GiftNotFound();
    error AlreadySettled();
    error TransferFailed();
    error NotYetReleasable();
    error RefundTooEarly();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    /// Sender deposits tokens for a gift. giftId is the Supabase UUID as bytes32.
    /// Pass releaseAt = 0 for instant gifts, or a future unix timestamp to schedule.
    function deposit(bytes32 giftId, address token, uint256 amount, uint256 releaseAt) external {
        if (gifts[giftId].sender != address(0)) revert AlreadyDeposited();
        if (amount == 0) revert TransferFailed();

        bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        gifts[giftId] = Gift({
            token: token,
            amount: amount,
            sender: msg.sender,
            releaseAt: releaseAt,
            depositedAt: block.timestamp,
            released: false,
            refunded: false
        });

        emit Deposited(giftId, msg.sender, token, amount);
    }

    /// Release tokens to recipient — only callable by our server wallet (owner).
    function release(bytes32 giftId, address recipient) external onlyOwner {
        Gift storage g = gifts[giftId];
        if (g.sender == address(0)) revert GiftNotFound();
        if (g.released || g.refunded) revert AlreadySettled();
        if (g.releaseAt != 0 && block.timestamp < g.releaseAt) revert NotYetReleasable();

        g.released = true;
        bool ok = IERC20(g.token).transfer(recipient, g.amount);
        if (!ok) revert TransferFailed();

        emit Released(giftId, recipient);
    }

    /// Sender can reclaim their tokens 2 days after the gift becomes releasable.
    /// For instant gifts (releaseAt = 0), refund is available 2 days after deposit.
    function refund(bytes32 giftId) external {
        Gift storage g = gifts[giftId];
        if (g.sender == address(0)) revert GiftNotFound();
        if (msg.sender != g.sender) revert Unauthorized();
        if (g.released || g.refunded) revert AlreadySettled();

        uint256 releasable = g.releaseAt == 0 ? g.depositedAt : g.releaseAt;
        if (block.timestamp < releasable + 2 days) revert RefundTooEarly();

        g.refunded = true;
        bool ok = IERC20(g.token).transfer(g.sender, g.amount);
        if (!ok) revert TransferFailed();

        emit Refunded(giftId, g.sender);
    }
}
