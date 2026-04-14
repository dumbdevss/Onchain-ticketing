# StellarTicket — On-Chain Event Ticketing & QR Verification

> Mint event tickets as Stellar tokens, share them via QR code, and verify entry on-chain — no fraud, no double entries, no middlemen.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Network: Stellar Testnet](https://img.shields.io/badge/Network-Stellar%20Testnet-blueviolet)](https://stellar.org)
[![Contract: Soroban](https://img.shields.io/badge/Contract-Soroban-orange)](https://soroban.stellar.org)

---

## What is this?

StellarTicket replaces paper tickets and centralised ticketing platforms with a fully on-chain system built on Stellar. Each ticket is a unique token minted by a Soroban smart contract. Attendees receive a QR code that encodes a signed ticket payload. At the gate, the organiser scans the QR code — the contract verifies ownership and marks the ticket as used, preventing double entry.

**Why this matters in Nigeria and Africa:** Ticket fraud is widespread at concerts, conferences, and sporting events. A blockchain-backed system makes every ticket traceable, unforgeable, and verifiable offline-capable.

**Why Stellar:** The same reasons as StellarPay — fast finality, near-zero fees, and a developer-friendly smart contract platform (Soroban).

---

## Demo flow

```
Organiser
  1. Visits /events/create        →  fills in event name, date, venue, capacity, ticket price
  2. Connects Freighter wallet    →  authenticated as event organiser
  3. Submits form                 →  event + ticket supply minted on Soroban contract
  4. Shares event page link       →  /events/:eventId

Attendee
  5. Opens /events/:eventId       →  sees event details + "Buy ticket" button
  6. Connects Freighter wallet    →  authenticates as buyer
  7. Pays in XLM or USDC         →  x402 payment flow (same as invoice system)
  8. Contract mints ticket token  →  unique ticket ID assigned
  9. Receives QR code             →  /tickets/:ticketId  (or downloaded PNG)

At the gate
  10. Organiser opens /scan       →  camera-based QR scanner in the browser
  11. Scans attendee's QR         →  decodes ticket ID + signature
  12. Contract verifies + marks   →  ticket status set to "used"
  13. Scanner shows green / red   →  entry granted or denied
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                        │
│                                                              │
│   /events/create        Create event + mint ticket supply    │
│   /events/:id           Public event page + buy flow         │
│   /tickets/:id          Attendee's ticket + QR code          │
│   /scan                 Organiser gate scanner               │
│   /dashboard            Organiser's event + sales overview   │
└───────────────────────────────┬──────────────────────────────┘
                                │ REST
┌───────────────────────────────▼──────────────────────────────┐
│                  API Server  (Express / Node.js)             │
│                                                              │
│   POST /api/events/create         create event              │
│   GET  /api/events/:id            event details             │
│   POST /api/tickets/purchase      x402 buy flow             │
│   POST /api/tickets/verify        verify + scan ticket       │
│   GET  /api/tickets/:id           ticket details            │
│   GET  /api/events/:id/tickets    all tickets for event      │
└───────────────────────────────┬──────────────────────────────┘
                                │ Soroban RPC
┌───────────────────────────────▼──────────────────────────────┐
│                Soroban Smart Contract  (Rust / WASM)         │
│                                                              │
│   create_event()     purchase_ticket()    use_ticket()       │
│   get_event()        get_ticket()         is_used()          │
│   get_event_tickets() cancel_ticket()     get_organiser_events()│
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                       Stellar Network                        │
│                 XLM  ·  USDC  ·  on-chain settlement         │
└──────────────────────────────────────────────────────────────┘
```

---

## Project structure

```
stellar-ticket/
├── contract/                           Soroban smart contract
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs                      Event + ticket logic
│
├── api-server/                         REST + x402 payment middleware
│   ├── server.js                       Express app
│   ├── qr.js                           QR code generation + signed payload
│   ├── package.json
│   └── .env.example
│
└── frontend/                           Next.js 14 app (App Router)
    ├── next.config.mjs
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.jsx
        │   ├── events/
        │   │   ├── create/page.jsx         Create event form
        │   │   └── [id]/page.jsx           Public event + buy page
        │   ├── tickets/
        │   │   └── [id]/page.jsx           Attendee ticket + QR
        │   ├── scan/page.jsx               Gate scanner
        │   └── dashboard/page.jsx          Organiser overview
        └── lib/
            ├── stellar.js                  Wallet + payment helpers
            └── qr.js                       QR decode + camera utils
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust + cargo | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Stellar CLI | latest | `cargo install --locked stellar-cli` |
| Node.js | 20+ | https://nodejs.org |
| Freighter wallet | latest | https://freighter.app (Chrome/Firefox extension) |

The `/scan` page uses the browser's `MediaDevices` camera API. Testing it requires a device with a camera or a browser with webcam access. Chrome and Firefox both support this on localhost.

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/stellar-ticket.git
cd stellar-ticket
```

### 2. Build and deploy the Soroban contract

```bash
cd contract

# Add the WASM compilation target
rustup target add wasm32-unknown-unknown

# Run the test suite
cargo test --features testutils

# Build the optimised WASM binary
stellar contract build

# Create and fund a testnet deployer account
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet

# Deploy — copy the printed contract ID
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_ticket_contract.wasm \
  --source deployer \
  --network testnet
```

### 3. Configure and start the API server

```bash
cd ../api-server
cp .env.example .env
# Paste your CONTRACT_ID into .env
npm install
npm run dev
# Server running on http://localhost:4001
```

### 4. Configure and start the frontend

```bash
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev
# App running on http://localhost:3001
```

### 5. Create your first event

1. Install Freighter and switch it to **Testnet**.
2. Fund your address at https://laboratory.stellar.org/#account-creator.
3. Open http://localhost:3001/events/create.
4. Fill in event details and submit — your ticket supply is minted on-chain.
5. Share the event link. Buy a ticket using a second testnet account.
6. Open `/scan` from the organiser account and scan the QR code to verify entry.

---

## Environment variables

### api-server — `.env`

| Variable | Description | Default |
|---|---|---|
| `STELLAR_NETWORK` | `testnet` or `mainnet` | `testnet` |
| `CONTRACT_ID` | Deployed Soroban contract ID | — |
| `ORGANISER_SECRET` | Server keypair for signing ticket payloads | — |
| `FRONTEND_URL` | Frontend origin (CORS) | `http://localhost:3001` |
| `USDC_ISSUER` | USDC issuer address | testnet address |
| `PORT` | Server port | `4001` |

### frontend — `.env.local`

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API server base URL | `http://localhost:4001` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` | `testnet` |

---

## Soroban contract reference

### Data types

```rust
enum TicketStatus { Valid, Used, Cancelled, Refunded }

struct Event {
    id: String,
    organiser: Address,
    name: String,
    description: String,
    venue: String,
    event_date: u64,         // Unix timestamp
    ticket_price: i128,      // in stroops
    ticket_asset: String,    // "XLM" | "USDC"
    total_supply: u32,
    tickets_sold: u32,
    created_at: u64,
    is_cancelled: bool,
}

struct Ticket {
    id: String,
    event_id: String,
    owner: Address,
    status: TicketStatus,
    purchased_at: u64,
    used_at: Option<u64>,
    seat_or_tier: Option<String>,    // e.g. "VIP" | "General"
    tx_hash: String,                 // purchase transaction hash
}
```

### Functions

| Function | Auth required | Description |
|---|---|---|
| `create_event(id, organiser, name, description, venue, event_date, ticket_price, ticket_asset, total_supply)` | `organiser` | Creates a new event and allocates supply |
| `purchase_ticket(ticket_id, event_id, buyer, paid_amount)` | `buyer` | Mints one ticket to the buyer's address |
| `use_ticket(ticket_id, verifier)` | `organiser` | Marks ticket as used at the gate |
| `cancel_ticket(ticket_id, owner)` | `owner` | Cancels a valid ticket (for refund flow) |
| `get_event(event_id)` | none | Returns the full event struct |
| `get_ticket(ticket_id)` | none | Returns the full ticket struct |
| `is_used(ticket_id)` | none | Returns a boolean |
| `get_event_tickets(event_id)` | none | Returns all ticket IDs for an event |
| `get_organiser_events(organiser)` | none | Returns all event IDs for an organiser |
| `tickets_remaining(event_id)` | none | Returns `total_supply - tickets_sold` |

### Stellar CLI usage

```bash
# Create an event
stellar contract invoke \
  --id <CONTRACT_ID> --source organiser_key --network testnet \
  -- create_event \
  --id '"evt_001"' \
  --organiser GXXX \
  --name '"Lagos Tech Summit 2025"' \
  --description '"Annual technology conference"' \
  --venue '"Eko Hotel, Lagos"' \
  --event_date 1750000000 \
  --ticket_price 100000000 \
  --ticket_asset '"XLM"' \
  --total_supply 500

# Purchase a ticket
stellar contract invoke \
  --id <CONTRACT_ID> --source buyer_key --network testnet \
  -- purchase_ticket \
  --ticket_id '"tkt_abc123"' \
  --event_id '"evt_001"' \
  --buyer GYYY \
  --paid_amount 100000000

# Mark a ticket used at the gate
stellar contract invoke \
  --id <CONTRACT_ID> --source organiser_key --network testnet \
  -- use_ticket \
  --ticket_id '"tkt_abc123"' \
  --verifier GXXX

# Check remaining supply
stellar contract invoke \
  --id <CONTRACT_ID> --network testnet \
  -- tickets_remaining --event_id '"evt_001"'
```

---

## QR code format

Each ticket's QR code encodes a signed JSON payload. The server signs the payload using an HMAC secret so that the scanner can verify authenticity without a network call.

```json
{
  "ticketId": "tkt_abc123",
  "eventId": "evt_001",
  "owner": "GYYY...",
  "issuedAt": 1720000000,
  "sig": "sha256-hmac-hex"
}
```

At the gate, the `/scan` page:

1. Decodes the QR payload.
2. Verifies the HMAC signature (offline-capable).
3. Makes a single API call to `POST /api/tickets/verify` which calls `use_ticket()` on the contract.
4. Displays green (valid) or red (already used / invalid signature).

---

## REST API reference

All endpoints are served from the API server (default port `4001`).

### `POST /api/events/create`

**Body:**
```json
{
  "name": "Lagos Tech Summit 2025",
  "description": "Annual technology conference",
  "venue": "Eko Hotel, Lagos",
  "eventDate": "2025-10-15T09:00:00Z",
  "ticketPrice": "10",
  "ticketAsset": "XLM",
  "totalSupply": 500,
  "organiserAddress": "GXXXXXXXXX"
}
```

**Response `201`:**
```json
{
  "eventId": "evt_abc123",
  "eventLink": "http://localhost:3001/events/evt_abc123",
  "event": { ... }
}
```

### `POST /api/tickets/purchase`

Implements the x402 flow. Without `X-Payment` header → returns `402` with payment details. With a valid signed payment in the `X-Payment` header → mints the ticket and returns `201`.

### `POST /api/tickets/verify`

**Body:**
```json
{
  "ticketId": "tkt_abc123",
  "sig": "hmac-hex",
  "organiserAddress": "GXXXXXXXXX"
}
```

Verifies the HMAC signature, checks ticket status on the contract, calls `use_ticket()`, and returns the result. Returns `200` for a valid first scan, `409` for an already-used ticket, and `401` for an invalid signature.

### `GET /api/events/:id`

Returns the full event object including `ticketsRemaining`.

### `GET /api/tickets/:id`

Returns the full ticket object.

### `GET /api/events/:id/tickets`

Returns all tickets for an event. Requires the organiser's address as a query parameter for authorisation.

---

## Running tests

```bash
cd contract
cargo test --features testutils -- --nocapture
```

Expected test coverage: event creation, ticket purchase, double-use prevention, sold-out enforcement, and cancellation.

---

## Offline verification mode

The QR signature check (HMAC verification) works without an internet connection. If the gate has no connectivity, the scanner can fall back to signature-only mode — it will accept tickets with a valid signature but cannot guarantee the ticket has not been scanned on a different device. A sync mechanism (pending scans queue → contract batch update) is listed in the roadmap.

---

## Testnet resources

- Fund a testnet account: https://laboratory.stellar.org/#account-creator
- Freighter wallet: https://freighter.app
- Stellar Expert (testnet explorer): https://stellar.expert/explorer/testnet
- Soroban documentation: https://soroban.stellar.org
- Stellar JS SDK: https://stellar.github.io/js-stellar-sdk

---

## Roadmap

- [ ] Resale marketplace — transfer tickets between wallets at a capped price
- [ ] Dynamic pricing — ticket price adjusts based on demand or time to event
- [ ] Event analytics dashboard — sales over time, demographics, revenue by tier
- [ ] Offline verification mode — queue scans and sync when connectivity returns
- [ ] Tiered tickets — VIP, Early Bird, General with separate supply per tier
- [ ] Refund flow — cancel ticket → automatic on-chain refund to buyer
- [ ] PDF / Apple Wallet ticket export
- [ ] WhatsApp ticket delivery
- [ ] USDC ticket pricing
- [ ] Multi-organiser events — co-host permissions on a single event

---

## License

MIT — see [LICENSE](LICENSE).
