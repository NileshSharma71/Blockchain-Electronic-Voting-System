#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🗳️  Starting Blockchain Electronic Voting System..."

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down services..."
  kill $(jobs -p) 2>/dev/null
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

# Check dependencies
if ! command -v node &>/dev/null || ! command -v npx &>/dev/null; then
  echo "Error: Node.js and npx are required. Please install them from https://nodejs.org"
  exit 1
fi

# Kill old processes on used ports
for port in 8545 3001 5173 5174 5175; do
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null || true
    echo "Cleaned up old process on port $port"
  fi
done
sleep 1

# Auto-install dependencies if missing
if [ ! -d "$DIR/blockchain/node_modules" ]; then
  echo "📦 Installing blockchain dependencies..."
  cd "$DIR/blockchain" && npm install --silent > /dev/null 2>&1
fi

if [ ! -d "$DIR/backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd "$DIR/backend" && npm install --silent > /dev/null 2>&1
fi

if [ ! -d "$DIR/frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd "$DIR/frontend" && npm install --silent > /dev/null 2>&1
fi

# 1. Start Hardhat node
echo "⛓️  Starting local blockchain (Hardhat)..."
cd "$DIR/blockchain" && npx hardhat node > /dev/null 2>&1 &
HARDHAT_PID=$!

for i in $(seq 1 15); do
  if curl -s http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 2. Deploy contracts (synchronous — backend must start AFTER this so it reads the address)
echo "📜 Deploying BallotAuditRegistry smart contract..."
cd "$DIR/blockchain" && npx hardhat run scripts/deploy.js --network localhost 2>&1 | grep -E "deployed to:|written to|exported|Error" || true
sleep 1  # Ensure .env write is flushed before backend reads it

# 3. Start backend (started AFTER deploy so BALLOT_AUDIT_REGISTRY_ADDRESS is in .env)
echo "🔧 Starting backend server..."
cd "$DIR/backend" && node -r dotenv/config src/server.js > /dev/null 2>&1 &
BACKEND_PID=$!

for i in $(seq 1 30); do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 4. Start frontends
echo "🎨 Starting frontends..."
cd "$DIR/frontend" && VITE_APP=main npx vite --host > /dev/null 2>&1 &
cd "$DIR/frontend" && VITE_APP=explorer npx vite --host > /dev/null 2>&1 &
cd "$DIR/frontend" && VITE_APP=dashboard npx vite --host > /dev/null 2>&1 &
sleep 3

echo ""
echo "=============================================="
echo "  🗳️  Blockchain E-Voting System is running!"
echo "=============================================="
echo ""
echo "  Main App:        http://localhost:5173"
echo "  Explorer:        http://localhost:5174/explorer.html"
echo "  Dashboard:       http://localhost:5175/dashboard.html"
echo ""
echo "  Demo Accounts (password: demo123):"
echo "    admin         — admin@evoting.local (Admin)"
echo "    rahul_kumar   — rahul@demo.local (Voter)"
echo "    priya_sharma  — priya@demo.local (Voter)"
echo "    amit_singh    — amit@demo.local (Voter)"
echo "    neha_gupta    — neha@demo.local (Voter)"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

wait
