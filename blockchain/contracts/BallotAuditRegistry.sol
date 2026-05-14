// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BallotAuditRegistry
/// @notice Immutable on-chain audit log for ballot casts and election results.
///         Stores only cryptographic hashes — no voter identity or choice is revealed.
contract BallotAuditRegistry {
    address public owner;

    // ── Ballot Audit ──

    uint256 public totalBallots;

    struct BallotRecord {
        bytes32 voterIdHash;      // SHA-256 hash of voter's internal ID
        bytes32 ballotHash;       // SHA-256 hash of (voterId + candidateId + nonce)
        bytes32 electionIdHash;   // SHA-256 hash of election ID
        uint64  timestamp;
    }

    mapping(uint256 => BallotRecord) private _ballots;

    event BallotLogged(
        uint256 indexed ballotIndex,
        bytes32 indexed electionIdHash,
        bytes32 voterIdHash,
        bytes32 ballotHash,
        uint64  timestamp
    );

    // ── Election Result Audit ──

    uint256 public totalResults;

    struct ResultRecord {
        bytes32 electionIdHash;   // SHA-256 hash of election ID
        bytes32 resultHash;       // SHA-256 hash of (electionId + all candidate vote counts)
        uint64  timestamp;
    }

    mapping(uint256 => ResultRecord) private _results;

    event ResultLogged(
        uint256 indexed resultIndex,
        bytes32 indexed electionIdHash,
        bytes32 resultHash,
        uint64  timestamp
    );

    // ── Access Control ──

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ── Write Functions ──

    /// @notice Log a ballot cast event on-chain.
    /// @param voterIdHash   Hash of the voter's internal user ID
    /// @param ballotHash    Hash of (voterId + candidateId + nonce) — proves vote integrity
    /// @param electionIdHash Hash of the election ID
    function logBallot(
        bytes32 voterIdHash,
        bytes32 ballotHash,
        bytes32 electionIdHash
    ) external onlyOwner {
        unchecked { ++totalBallots; }
        _ballots[totalBallots] = BallotRecord({
            voterIdHash: voterIdHash,
            ballotHash: ballotHash,
            electionIdHash: electionIdHash,
            timestamp: uint64(block.timestamp)
        });

        emit BallotLogged(
            totalBallots,
            electionIdHash,
            voterIdHash,
            ballotHash,
            uint64(block.timestamp)
        );
    }

    /// @notice Log the final election result on-chain.
    /// @param electionIdHash Hash of the election ID
    /// @param resultHash     Hash of (electionId + candidate1:count1 + candidate2:count2 + ...)
    function logResult(
        bytes32 electionIdHash,
        bytes32 resultHash
    ) external onlyOwner {
        unchecked { ++totalResults; }
        _results[totalResults] = ResultRecord({
            electionIdHash: electionIdHash,
            resultHash: resultHash,
            timestamp: uint64(block.timestamp)
        });

        emit ResultLogged(
            totalResults,
            electionIdHash,
            resultHash,
            uint64(block.timestamp)
        );
    }

    // ── Read Functions ──

    /// @notice Retrieve a ballot audit record by index.
    function getBallot(uint256 index) external view returns (
        bytes32 voterIdHash,
        bytes32 ballotHash,
        bytes32 electionIdHash,
        uint64  timestamp,
        bool    exists
    ) {
        BallotRecord memory b = _ballots[index];
        return (b.voterIdHash, b.ballotHash, b.electionIdHash, b.timestamp, b.timestamp != 0);
    }

    /// @notice Retrieve an election result audit record by index.
    function getResult(uint256 index) external view returns (
        bytes32 electionIdHash,
        bytes32 resultHash,
        uint64  timestamp,
        bool    exists
    ) {
        ResultRecord memory r = _results[index];
        return (r.electionIdHash, r.resultHash, r.timestamp, r.timestamp != 0);
    }
}
