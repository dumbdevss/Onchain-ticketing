#!/usr/bin/env bash
# Deploy the stellar-ticket Soroban contract to the Stellar testnet.
#
# Usage:
#   ./scripts/deploy-testnet.sh [identity-name]
#
# Defaults to identity name `ticket-deployer`. The contract id is printed
# at the end and also written to ./.contract-id-testnet for convenience.
#
# Requirements:
#   - rustup with the wasm32-unknown-unknown target
#   - the `stellar` CLI (>= 22)

set -euo pipefail

IDENTITY="${1:-ticket-deployer}"
WASM_PATH="target/wasm32-unknown-unknown/release/stellar_ticket.wasm"

echo "==> Ensuring wasm32 target is installed"
rustup target add wasm32-unknown-unknown >/dev/null

echo "==> Running contract tests"
cargo test --package stellar-ticket --quiet

echo "==> Building contract"
stellar contract build

if [ ! -f "$WASM_PATH" ]; then
  # The build sometimes places artefacts under contracts/stellar-ticket/target
  ALT_PATH="contracts/stellar-ticket/target/wasm32-unknown-unknown/release/stellar_ticket.wasm"
  if [ -f "$ALT_PATH" ]; then
    WASM_PATH="$ALT_PATH"
  else
    echo "Could not locate compiled wasm at $WASM_PATH or $ALT_PATH" >&2
    exit 1
  fi
fi

echo "==> Optimising wasm (optional, ignored if not available)"
stellar contract optimize --wasm "$WASM_PATH" || true
if [ -f "${WASM_PATH%.wasm}.optimized.wasm" ]; then
  WASM_PATH="${WASM_PATH%.wasm}.optimized.wasm"
fi

echo "==> Ensuring deployer identity '$IDENTITY' exists and is funded on testnet"
if ! stellar keys ls 2>/dev/null | grep -qx "$IDENTITY"; then
  stellar keys generate "$IDENTITY" --network testnet
fi
stellar keys fund "$IDENTITY" --network testnet || true

echo "==> Deploying contract to testnet"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$IDENTITY" \
  --network testnet)

echo "$CONTRACT_ID" > .contract-id-testnet
echo
echo "================================================================"
echo " Deployed stellar-ticket to testnet"
echo " Contract ID: $CONTRACT_ID"
echo " Saved to:    .contract-id-testnet"
echo
echo " Next steps:"
echo "   1. Add to your .env.local (Next.js exposes NEXT_PUBLIC_* to the browser):"
echo "        NEXT_PUBLIC_TICKETING_CONTRACT_ID=$CONTRACT_ID"
echo "   2. Set network env vars:"
echo "        NEXT_PUBLIC_STELLAR_NETWORK=TESTNET"
echo "        NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=\"Test SDF Network ; September 2015\""
echo "        NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org"
echo "        NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org"
echo "   3. Restart Next.js (npm run dev)"
echo "================================================================"
