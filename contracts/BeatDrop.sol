// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BeatDrop - short, four-seat, on-chain collaborative loops
/// @notice TESTNET PROTOTYPE. Not audited. Contributions are account attribution,
///         not legal copyright registration or music royalty collection.
contract BeatDrop {
    enum Phase { Lobby, Live, Finalized }

    uint64 public constant ROUND_DURATION = 90;
    uint64 public constant MAX_SESSION_LIFETIME = 1 days;
    uint8 public constant MAX_BATCH = 16;

    struct Room {
        address host;
        bytes32 name;
        Phase phase;
        uint64 startedAt;
        uint64 endsAt;
        uint64 finalizedAt;
        uint8 eligibleMask;
        address[4] seats;
        // 4 instruments × 16 steps:
        // drums = four-bit (kick/snare/hat/clap) mask 0..15
        // melodic = 0 rest, 1..16 ascending pentatonic note indexes
        uint8[16][4] pattern;
        uint256 totalTipped;
        uint256 totalClaimed;
    }

    uint256 public nextRoomId = 1;
    mapping(uint256 => Room) private _rooms;

    // room => main wallet => session key => expiry
    mapping(uint256 => mapping(address => mapping(address => uint64))) public sessionExpiry;
    // room => contributor's MAIN wallet => outstanding / already withdrawn
    mapping(uint256 => mapping(address => uint256)) public claimable;
    mapping(uint256 => mapping(address => uint256)) public claimed;

    uint256 private _claimLock = 1;

    event RoomCreated(uint256 indexed roomId, address indexed host, bytes32 name);
    event SeatAssigned(uint256 indexed roomId, uint8 indexed instrument, address indexed owner);
    event RoomStarted(uint256 indexed roomId, uint64 startedAt, uint64 endsAt);
    event SessionAuthorized(uint256 indexed roomId, address indexed owner, address indexed key, uint64 expiresAt);
    event SessionRevoked(uint256 indexed roomId, address indexed owner, address indexed key);
    event NoteSet(uint256 indexed roomId, uint8 indexed instrument, uint8 step, uint8 value, address indexed owner, address operator);
    event RoomFinalized(uint256 indexed roomId, uint8 eligibleMask);
    event TipReceived(uint256 indexed roomId, address indexed from, uint256 amount);
    event TipAllocated(uint256 indexed roomId, address indexed owner, uint256 amount);
    event Claimed(uint256 indexed roomId, address indexed owner, uint256 amount);

    error UnknownRoom();
    error WrongPhase();
    error NotHost();
    error InvalidSeat();
    error InvalidOwner();
    error InvalidName();
    error InvalidSession();
    error NotAuthorized();
    error InvalidBatch();
    error InvalidNote();
    error NoSeats();
    error TooEarly();
    error NoContributions();
    error EmptyTip();
    error NothingToClaim();
    error TransferFailed();
    error ReentrantCall();
    error DirectTransferDisabled();

    modifier exists(uint256 roomId) {
        if (_rooms[roomId].host == address(0)) revert UnknownRoom();
        _;
    }

    modifier notReentrant() {
        if (_claimLock != 1) revert ReentrantCall();
        _claimLock = 2;
        _;
        _claimLock = 1;
    }

    function createRoom(bytes32 name) external returns (uint256 roomId) {
        if (name == bytes32(0)) revert InvalidName();
        roomId = nextRoomId++;
        Room storage room = _rooms[roomId];
        room.host = msg.sender;
        room.name = name;
        emit RoomCreated(roomId, msg.sender, name);
    }

    /// @notice Host-approved seat assignment; may be changed ONLY in Lobby.
    /// @dev Zero address clears a seat. One wallet can hold multiple seats.
    function assignSeat(uint256 roomId, uint8 seat, address owner) external exists(roomId) {
        Room storage room = _rooms[roomId];
        if (msg.sender != room.host) revert NotHost();
        if (room.phase != Phase.Lobby) revert WrongPhase();
        if (seat >= 4) revert InvalidSeat();
        room.seats[seat] = owner;
        emit SeatAssigned(roomId, seat, owner);
    }

    function startRoom(uint256 roomId) external exists(roomId) {
        Room storage room = _rooms[roomId];
        if (msg.sender != room.host) revert NotHost();
        if (room.phase != Phase.Lobby) revert WrongPhase();
        bool occupied;
        for (uint8 i = 0; i < 4; ++i) {
            if (room.seats[i] != address(0)) occupied = true;
        }
        if (!occupied) revert NoSeats();
        room.startedAt = uint64(block.timestamp);
        room.endsAt = uint64(block.timestamp + ROUND_DURATION);
        room.phase = Phase.Live;
        emit RoomStarted(roomId, room.startedAt, room.endsAt);
    }

    /// @notice Owner registers one temporary key for THIS room, expiry <= 1 day.
    /// @dev Registering does NOT transfer MON or automatically fund gas for the key.
    function authorizeSession(uint256 roomId, address key, uint64 expiresAt) external exists(roomId) {
        Room storage room = _rooms[roomId];
        if (room.phase == Phase.Finalized) revert WrongPhase();
        if (key == address(0) || key == msg.sender ||
            expiresAt <= block.timestamp ||
            expiresAt > block.timestamp + MAX_SESSION_LIFETIME) revert InvalidSession();

        bool ownsSeat;
        for (uint8 i = 0; i < 4; ++i) {
            if (room.seats[i] == msg.sender) ownsSeat = true;
        }
        if (!ownsSeat) revert InvalidOwner();
        sessionExpiry[roomId][msg.sender][key] = expiresAt;
        emit SessionAuthorized(roomId, msg.sender, key, expiresAt);
    }

    function revokeSession(uint256 roomId, address key) external exists(roomId) {
        sessionExpiry[roomId][msg.sender][key] = 0;
        emit SessionRevoked(roomId, msg.sender, key);
    }

    /// @notice Explicit idempotent cell SETS; not toggle operations.
    /// @param instrument 0=drums, 1=bass, 2=synth, 3=pluck
    /// @param steps Ascending unique step indices in [0,15].
    /// @param values Drum mask 0..15; melodic rest=0, notes=1..16.
    /// @param owner Main wallet owning the lane; NOT the gas-paying session key.
    function setNotes(
        uint256 roomId, uint8 instrument, uint8[] calldata steps,
        uint8[] calldata values, address owner
    ) external exists(roomId) {
        Room storage room = _rooms[roomId];
        if (room.phase != Phase.Live || block.timestamp >= room.endsAt) revert WrongPhase();
        if (instrument >= 4) revert InvalidSeat();
        if (owner == address(0) || room.seats[instrument] != owner) revert InvalidOwner();
        if (msg.sender != owner && sessionExpiry[roomId][owner][msg.sender] <= block.timestamp) {
            revert NotAuthorized();
        }
        uint256 count = steps.length;
        if (count == 0 || count > MAX_BATCH || values.length != count) revert InvalidBatch();

        for (uint256 i = 0; i < count; ++i) {
            uint8 s = steps[i];
            uint8 value = values[i];
            if (s >= 16 || (i > 0 && s <= steps[i - 1])) revert InvalidBatch();
            if (instrument == 0 ? value > 15 : value > 16) revert InvalidNote();
            room.pattern[instrument][s] = value;
            emit NoteSet(roomId, instrument, s, value, owner, msg.sender);
        }
    }

    /// @notice Anyone may finalize AFTER the 90-second submission deadline.
    ///         Finalization freezes the pattern and eligible instrument seats.
    function finalizeRoom(uint256 roomId) external exists(roomId) {
        Room storage room = _rooms[roomId];
        if (room.phase != Phase.Live) revert WrongPhase();
        if (block.timestamp < room.endsAt) revert TooEarly();

        uint8 mask;
        for (uint8 lane = 0; lane < 4; ++lane) {
            if (room.seats[lane] == address(0)) continue;
            for (uint8 s = 0; s < 16; ++s) {
                if (room.pattern[lane][s] != 0) {
                    mask |= uint8(1) << lane;
                    break;
                }
            }
        }
        room.eligibleMask = mask;
        room.phase = Phase.Finalized;
        room.finalizedAt = uint64(block.timestamp);
        emit RoomFinalized(roomId, mask);
    }

    /// @notice Split an exact native MON tip equally by non-empty SEATS, not edits.
    ///         Any integer remainder goes to the first active seat (index ascending).
    ///         Multiple seats owned by one wallet aggregate to that wallet.
    function tip(uint256 roomId) external payable exists(roomId) {
        Room storage room = _rooms[roomId];
        if (room.phase != Phase.Finalized) revert WrongPhase();
        if (room.eligibleMask == 0) revert NoContributions();
        if (msg.value == 0) revert EmptyTip();

        uint8 count;
        uint8 first;
        for (uint8 lane = 0; lane < 4; ++lane) {
            if (room.eligibleMask & (uint8(1) << lane) != 0) {
                if (count == 0) first = lane;
                ++count;
            }
        }
        uint256 equalAmount = msg.value / count;
        uint256 remainder = msg.value % count;
        room.totalTipped += msg.value;
        for (uint8 lane = 0; lane < 4; ++lane) {
            if (room.eligibleMask & (uint8(1) << lane) == 0) continue;
            uint256 amount = equalAmount + (lane == first ? remainder : 0);
            address recipient = room.seats[lane];
            claimable[roomId][recipient] += amount;
            emit TipAllocated(roomId, recipient, amount);
        }
        emit TipReceived(roomId, msg.sender, msg.value);
    }

    /// @notice Pull-based withdrawal to the original main wallet only.
    function claim(uint256 roomId) external exists(roomId) notReentrant {
        uint256 amount = claimable[roomId][msg.sender];
        if (amount == 0) revert NothingToClaim();
        claimable[roomId][msg.sender] = 0;
        claimed[roomId][msg.sender] += amount;
        _rooms[roomId].totalClaimed += amount;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Claimed(roomId, msg.sender, amount);
    }

    function getRoom(uint256 roomId) external view exists(roomId) returns (
        address host, bytes32 name, Phase phase,
        address[4] memory seats, uint64 startedAt, uint64 endsAt,
        uint64 finalizedAt, uint8 eligibleMask,
        uint256 totalTipped, uint256 totalClaimed
    ) {
        Room storage room = _rooms[roomId];
        return (
            room.host, room.name, room.phase, room.seats,
            room.startedAt, room.endsAt, room.finalizedAt,
            room.eligibleMask, room.totalTipped, room.totalClaimed
        );
    }

    function getPattern(uint256 roomId) external view exists(roomId) returns (uint8[16][4] memory) {
        return _rooms[roomId].pattern;
    }

    function getLane(uint256 roomId, uint8 instrument)
        external view exists(roomId) returns (uint8[16] memory)
    {
        if (instrument >= 4) revert InvalidSeat();
        return _rooms[roomId].pattern[instrument];
    }

    receive() external payable { revert DirectTransferDisabled(); }
    fallback() external payable { revert DirectTransferDisabled(); }
}
