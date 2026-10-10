// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../BeatDrop.sol";

/// @dev Security-test fixture, not a user-facing contract.
contract ReenteringSeat {
    BeatDrop public immutable beat;
    uint256 public roomId;
    bool public attempted;
    bool public reentryBlocked;

    constructor(BeatDrop target) { beat = target; }

    function playDrum(uint256 id) external {
        roomId = id;
        uint8[] memory steps = new uint8[](1);
        uint8[] memory values = new uint8[](1);
        steps[0] = 0;
        values[0] = 1;
        beat.setNotes(id, 0, steps, values, address(this));
    }

    function requestClaim() external { beat.claim(roomId); }

    receive() external payable {
        attempted = true;
        try beat.claim(roomId) {
            reentryBlocked = false;
        } catch {
            reentryBlocked = true;
        }
    }
}
