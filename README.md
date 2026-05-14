# 🗳️ Blockchain Electronic Voting System

A decentralized electronic voting platform built on blockchain technology. Every ballot is cryptographically hashed and logged on-chain, ensuring tamper-proof, transparent, and verifiable elections.

## Overview

This system enables secure electronic voting where:

- **Admins** create elections with multiple candidates and set voting periods
- **Verified voters** cast one ballot per election — enforced at both database and application level
- **Every ballot** is SHA-256 hashed and recorded on a local Ethereum blockchain (Hardhat) as an immutable audit trail
- **Election results** are automatically tallied when the voting period ends, with the result proof hash committed on-chain
- **Anti-fraud mechanisms** detect and prevent double voting, rapid-fire ballot stuffing, and IP-based Sybil attacks

The blockchain serves as an **immutable audit layer** — actual ballot data is stored off-chain in MongoDB for performance, while cryptographic hashes are written on-chain so anyone can independently verify that no records were tampered with.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Blockchain** | Hardhat + Solidity (v0.8.20) | Local Ethereum node + Smart contracts |
| **Backend** | Node.js + Express + MongoDB | API server, business logic, data storage |
| **Frontend** | React (Vite) | Voting interface, explorer, dashboard |
| **Real-time** | Socket.io | Live vote count updates |
| **Auth** | JWT | User authentication |
| **Hashing** | SHA-256 | Ballot integrity verification |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Backend   │────▶│  MongoDB         │
│  (React/Vite)│◀────│  (Express)  │◀────│  (Off-chain data)│
└─────────────┘     └──────┬──────┘     └──────────────────┘
                           │
                    ethers.js (JSON-RPC)
                           │
                    ┌──────▼──────┐
                    │  Hardhat    │
                    │  Blockchain │
                    │  (On-chain  │
                    │   audit)    │
                    └─────────────┘
```

**How blockchain is used:**
1. When a voter casts a ballot → `hash(voterId + candidateId + nonce)` is logged on-chain
2. When an election ends → `hash(electionId + all vote counts)` is logged on-chain
3. Anyone can query the blockchain explorer to verify these hashes match the off-chain data

## Setup

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on default port (27017)

### Run
```bash
chmod +x start-all.sh
./start-all.sh
```

This will automatically:
1. Install all dependencies
2. Start a local Hardhat blockchain (port 8545)
3. Deploy the smart contract
4. Start the backend server (port 3001)
5. Start the frontend apps

### Access Points
- **Main App:** http://localhost:5173 — Create elections, manage users, and cast votes
- **Blockchain Explorer:** http://localhost:5174/explorer.html — Public ledger auditor with a Universal Hash Verifier
- **Database Dashboard:** http://localhost:5175/dashboard.html — Inspector tool for raw off-chain MongoDB data

## Project Structure

```
├── blockchain/          # Hardhat project
│   ├── contracts/       # Solidity smart contracts
│   └── scripts/         # Deployment scripts
├── backend/             # Express API server
│   └── src/
│       ├── models/      # MongoDB schemas (Election, Ballot, User)
│       ├── routes/      # API endpoints
│       ├── services/    # Business logic (tally, blockchain, etc.)
│       ├── middleware/  # Auth, rate limiting, fraud detection
│       └── utils/       # Hashing, math helpers
├── frontend/            # React (Vite) app
│   └── src/
│       ├── pages/       # Election list, voting, results
│       └── components/  # Reusable UI components
└── start-all.sh         # One-command startup script
```

## Acknowledgments

This project was adapted and modified from the [News Verification System with Blockchain Audit and Reputation Weights](https://github.com/Dhruv-aka-Dp/NewsVerification-System-with-Blockchain-Audit-and-Reputation-Weights) created by [Dhruv-aka-Dp](https://github.com/Dhruv-aka-Dp). The original project's blockchain integration architecture, anti-fraud mechanisms, and hashing infrastructure were repurposed to serve as the foundation for this Electronic Voting System.

## License

This project is for educational purposes.
