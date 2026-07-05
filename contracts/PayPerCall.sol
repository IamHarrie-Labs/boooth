// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ToolRegistry.sol";

/// @notice Lets an autonomous agent pay a registered provider per call, in the
/// same transaction as logging the agent's execution step. Both the payment
/// and the reasoning trail live on-chain, which only makes sense on a chain
/// with near-zero fees and sub-second blocks.
contract PayPerCall {
    ToolRegistry public immutable registry;

    event CallPaid(
        uint256 indexed providerId,
        address indexed payer,
        address indexed payoutAddress,
        uint256 amount,
        uint256 timestamp
    );

    event StepLogged(
        address indexed agent,
        uint256 indexed taskId,
        uint256 stepIndex,
        uint256 indexed providerId,
        string summary,
        bytes32 dataHash,
        uint256 timestamp
    );

    constructor(address registryAddress) {
        registry = ToolRegistry(registryAddress);
    }

    /// @param taskId caller-chosen id grouping steps of one agent run
    /// @param stepIndex sequence number within that run
    /// @param summary short human-readable description of what this step did
    /// @param dataHash hash of the payload the agent received/produced (verifiable off-chain)
    function payAndLog(
        uint256 providerId,
        uint256 taskId,
        uint256 stepIndex,
        string calldata summary,
        bytes32 dataHash
    ) external payable {
        ToolRegistry.Provider memory p = registry.getProvider(providerId);
        require(p.active, "provider inactive");
        require(msg.value >= p.pricePerCall, "insufficient payment");

        (bool sent, ) = p.payoutAddress.call{value: msg.value}("");
        require(sent, "payout failed");

        emit CallPaid(providerId, msg.sender, p.payoutAddress, msg.value, block.timestamp);
        emit StepLogged(msg.sender, taskId, stepIndex, providerId, summary, dataHash, block.timestamp);
    }
}
