require('dotenv').config();
const { ethers } = require('ethers');

// ABI for the BallotAuditRegistry contract
const BALLOT_AUDIT_ABI = [
  'function logBallot(bytes32 voterIdHash, bytes32 ballotHash, bytes32 electionIdHash) external',
  'function logResult(bytes32 electionIdHash, bytes32 resultHash) external',
  'function getBallot(uint256 index) external view returns (bytes32, bytes32, bytes32, uint64, bool)',
  'function getResult(uint256 index) external view returns (bytes32, bytes32, uint64, bool)',
  'function totalBallots() external view returns (uint256)',
  'function totalResults() external view returns (uint256)',
  'event BallotLogged(uint256 indexed ballotIndex, bytes32 indexed electionIdHash, bytes32 voterIdHash, bytes32 ballotHash, uint64 timestamp)',
  'event ResultLogged(uint256 indexed resultIndex, bytes32 indexed electionIdHash, bytes32 resultHash, uint64 timestamp)',
];

let provider = null;
let wallet = null;
let initialized = false;

function getProvider() {
  if (!provider) {
    const rpcUrl = process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545';
    provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
  }
  return provider;
}

function getWallet() {
  if (!initialized) {
    try {
      const pk = process.env.DEPLOYER_PRIVATE_KEY;
      if (!pk) { console.warn('DEPLOYER_PRIVATE_KEY not set. Blockchain logging disabled.'); return null; }
      wallet = new ethers.Wallet(pk, getProvider());
      initialized = true;
    } catch (e) { console.warn('Wallet init failed:', e.message); }
  }
  return wallet;
}

function getContract(address, abi, useWallet = true) {
  if (!address) return null;
  const signer = useWallet ? getWallet() : getProvider();
  if (!signer) return null;
  return new ethers.Contract(address, abi, signer);
}

// ── WRITE ──

async function logBallotOnChain(voterIdHash, ballotHash, electionIdHash) {
  try {
    const c = getContract(process.env.BALLOT_AUDIT_REGISTRY_ADDRESS, BALLOT_AUDIT_ABI);
    if (!c) return null;
    const tx = await c.logBallot(voterIdHash, ballotHash, electionIdHash);
    await tx.wait();
    return tx.hash;
  } catch (e) { console.warn('logBallotOnChain failed:', e.message); return null; }
}

async function logResultOnChain(electionIdHash, resultHash) {
  try {
    const c = getContract(process.env.BALLOT_AUDIT_REGISTRY_ADDRESS, BALLOT_AUDIT_ABI);
    if (!c) return null;
    const tx = await c.logResult(electionIdHash, resultHash);
    await tx.wait();
    return tx.hash;
  } catch (e) { console.warn('logResultOnChain failed:', e.message); return null; }
}

// ── READ (for explorer) ──

async function getHealth() {
  try {
    const p = getProvider();
    const blockNumber = await p.getBlockNumber();
    const network = await p.getNetwork();
    return {
      connected: true,
      blockNumber,
      chainId: Number(network.chainId),
      rpcUrl: process.env.HARDHAT_RPC_URL || 'http://localhost:8545',
      contractAddress: process.env.BALLOT_AUDIT_REGISTRY_ADDRESS || null
    };
  } catch (e) { return { connected: false, error: e.message }; }
}

async function getStats() {
  const p = getProvider();
  const blockNumber = await p.getBlockNumber();
  let totalBallots = 0;
  let totalResults = 0;
  try {
    const c = getContract(process.env.BALLOT_AUDIT_REGISTRY_ADDRESS, BALLOT_AUDIT_ABI, false);
    if (c) {
      totalBallots = Number(await c.totalBallots());
      totalResults = Number(await c.totalResults());
    }
  } catch {}
  return { blockNumber, totalBallots, totalResults };
}

async function getBallotEvents(page = 1, limit = 20) {
  const c = getContract(process.env.BALLOT_AUDIT_REGISTRY_ADDRESS, BALLOT_AUDIT_ABI, false);
  if (!c) return { items: [], total: 0 };
  const total = Number(await c.totalBallots());
  const start = Math.max(1, total - page * limit + 1);
  const end = total - (page - 1) * limit;
  const items = [];
  for (let i = end; i >= start; i--) {
    if (i <= 0) break;
    try {
      const [voterIdHash, ballotHash, electionIdHash, timestamp, exists] = await c.getBallot(i);
      if (exists) {
        items.push({
          ballotIndex: i,
          voterIdHash,
          ballotHash,
          electionIdHash,
          timestamp: Number(timestamp),
        });
      }
    } catch { break; }
  }
  return { items, total };
}

async function getResultEvents(page = 1, limit = 20) {
  const c = getContract(process.env.BALLOT_AUDIT_REGISTRY_ADDRESS, BALLOT_AUDIT_ABI, false);
  if (!c) return { items: [], total: 0 };
  const total = Number(await c.totalResults());
  const start = Math.max(1, total - page * limit + 1);
  const end = total - (page - 1) * limit;
  const items = [];
  for (let i = end; i >= start; i--) {
    if (i <= 0) break;
    try {
      const [electionIdHash, resultHash, timestamp, exists] = await c.getResult(i);
      if (exists) {
        items.push({
          resultIndex: i,
          electionIdHash,
          resultHash,
          timestamp: Number(timestamp),
        });
      }
    } catch { break; }
  }
  return { items, total };
}

module.exports = {
  logBallotOnChain,
  logResultOnChain,
  getHealth,
  getStats,
  getBallotEvents,
  getResultEvents,
};
