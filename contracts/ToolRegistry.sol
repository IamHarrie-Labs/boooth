// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Registry of pay-per-call providers (AI tools, IoT/DePIN data feeds, etc).
/// Providers set their own price; agents look them up before paying via PayPerCall.
contract ToolRegistry {
    struct Provider {
        address payoutAddress;
        string name;
        string kind; // e.g. "ai-tool", "telemetry", "dataset"
        uint256 pricePerCall; // in wei
        bool active;
    }

    mapping(uint256 => Provider) public providers;
    uint256 public providerCount;

    event ProviderRegistered(uint256 indexed id, address indexed payoutAddress, string name, string kind, uint256 pricePerCall);
    event ProviderPriceUpdated(uint256 indexed id, uint256 newPrice);
    event ProviderStatusUpdated(uint256 indexed id, bool active);

    function registerProvider(string calldata name, string calldata kind, uint256 pricePerCall) external returns (uint256 id) {
        id = providerCount++;
        providers[id] = Provider({
            payoutAddress: msg.sender,
            name: name,
            kind: kind,
            pricePerCall: pricePerCall,
            active: true
        });
        emit ProviderRegistered(id, msg.sender, name, kind, pricePerCall);
    }

    function setPrice(uint256 id, uint256 newPrice) external {
        Provider storage p = providers[id];
        require(msg.sender == p.payoutAddress, "not provider owner");
        p.pricePerCall = newPrice;
        emit ProviderPriceUpdated(id, newPrice);
    }

    function setActive(uint256 id, bool active) external {
        Provider storage p = providers[id];
        require(msg.sender == p.payoutAddress, "not provider owner");
        p.active = active;
        emit ProviderStatusUpdated(id, active);
    }

    function getProvider(uint256 id) external view returns (Provider memory) {
        return providers[id];
    }
}
