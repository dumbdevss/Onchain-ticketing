# Contributing to StellarTicket

Thank you for your interest in contributing. StellarTicket is an open, community-driven project. Whether you are fixing a bug, improving the scanner UX, writing a new contract function, or documenting a flow you found confusing — every contribution matters. This guide covers how to work effectively in this codebase.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Ways to contribute](#ways-to-contribute)
- [Development setup](#development-setup)
- [Project conventions](#project-conventions)
- [Submitting a pull request](#submitting-a-pull-request)
- [Good first issues](#good-first-issues)
- [Bigger features — open for contribution](#bigger-features--open-for-contribution)
- [Working with the QR scanner](#working-with-the-qr-scanner)
- [Contract upgrade policy](#contract-upgrade-policy)
- [Getting help](#getting-help)

---

## Code of conduct

Treat every contributor with respect. This project serves event organisers and attendees across Africa — many of whom have been burned by fraud or unreliable systems before. Keep that in mind when making decisions, especially around security and UX.

Harassment, discriminatory language, or bad-faith behaviour will result in removal from the project.

---

## Ways to contribute

You do not need to write code to contribute meaningfully.

- **Report a bug** — open an issue with a clear description, steps to reproduce, and your OS, browser, and wallet version.
- **Suggest a feature** — open an issue tagged `enhancement`. Describe the use case first.
- **Improve documentation** — the README, this file, inline code comments.
- **Write tests** — especially for contract edge cases (sold-out events, double scans, refunds).
- **Design a component** — the scanner UI and event dashboard have room for improvement.
- **Build an extension** — see the [Bigger features](#bigger-features--open-for-contribution) section.

---

## Development setup

Full instructions are in [README.md](README.md). Summary:

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/stellar-ticket.git
cd stellar-ticket

# Contract
cd contract
rustup target add wasm32-unknown-unknown
cargo test --features testutils

# API server
cd ../api-server
cp .env.example .env
npm install
npm run dev           # http://localhost:4001

# Frontend
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev           # http://localhost:3001
```

For the QR scanner to work in development, you need a device with a camera or a browser with webcam access. Chrome on desktop (with a webcam) works fine.

---

## Project conventions

### Git workflow

- Fork the repo. Work on a branch: `feat/resale-marketplace`, `fix/scanner-dark-mode`, `docs/contract-ref`.
- Commit messages in the imperative present tense: `Add tiered ticket support to create_event`, not `Added tiers`.
- One logical change per commit.
- Open PRs against `main`. Reference any related issue.
- Keep PRs focused — multiple unrelated changes slow down review.

### Soroban contract (Rust)

- Run `cargo fmt` and `cargo clippy --features testutils -- -D warnings` before every commit. Zero warnings.
- Every new public function must have a corresponding test under `#[cfg(test)]`.
- Amounts are always in **stroops** (`i128`). When a function receives or returns an amount, add an inline comment: `// stroops`.
- All storage keys must be variants of the `DataKey` enum — never use raw string keys.
- Do not change the signature of an existing public function without opening an issue and getting agreement first. Deployed contracts are immutable; signature changes require a new deployment. See [Contract upgrade policy](#contract-upgrade-policy).
- Event IDs and ticket IDs must always be treated as opaque strings in the contract. The contract must not assume any format.

### API server (Node.js)

- ES modules throughout (`import`, not `require`).
- All route handlers are async. Return a structured JSON error object on failure: `{ error: "Human-readable message" }`.
- QR payload signing lives in `qr.js`, not in `server.js`. Keep concerns separated.
- The contract is the source of truth. Server-side state (if any) is a cache, not the authority.
- Do not log sensitive data (private keys, full QR payloads) even at debug level.

### Frontend (Next.js / React)

- App Router only.
- Tailwind for all styling — no component-scoped CSS files.
- All Stellar and wallet logic lives in `src/lib/stellar.js`.
- All QR encode/decode logic lives in `src/lib/qr.js`.
- Components own layout and interaction only — no inline `fetch()` calls.
- The `/scan` page uses the `MediaDevices` camera API. Check `navigator.mediaDevices` exists before calling it and show a helpful error if it does not.

### Security

- HMAC signatures on QR payloads are the first line of defence against forged tickets. Do not weaken or skip this check in any code path.
- The `ORGANISER_SECRET` in `.env` must never be committed or logged. If you add any logging, grep your diff for anything that might accidentally include this value.
- The `use_ticket()` contract function requires organiser auth. Never expose an unauthenticated path that calls this function.

---

## Submitting a pull request

1. `cargo test --features testutils` — all tests pass.
2. `cargo fmt && cargo clippy --features testutils -- -D warnings` — no warnings.
3. `npm run build` in `frontend/` — no build errors.
4. Fill in the PR template:
   - **What does this PR change?**
   - **Why is this needed / what problem does it solve?**
   - **How was it tested?** (list steps or name tests added)
   - **Screenshots** for any UI changes.
5. PRs that touch the contract will receive additional review. See [Contract upgrade policy](#contract-upgrade-policy).

---

## Good first issues

These are well-scoped and a good way to get familiar with the codebase.

### Frontend

**Tickets remaining indicator on the event page**

The `/events/:id` page shows event details but does not display how many tickets are left. Add a visible "X tickets remaining" label that updates when the page loads. Pull the number from `GET /api/events/:id` which includes `ticketsRemaining`. Show "Sold out" and disable the buy button when `ticketsRemaining === 0`.

Files: `frontend/src/app/events/[id]/page.jsx`

---

**Scanner sound feedback**

The `/scan` page currently shows a visual indicator (green/red) when a ticket is scanned. Add an audio cue: a short pleasant tone for a valid ticket and a lower tone for an invalid or already-used one. Use the Web Audio API (`AudioContext`) — no external library needed.

Files: `frontend/src/app/scan/page.jsx`

---

**Download QR as PNG**

The `/tickets/:id` page shows the QR code in the browser. Add a "Download QR" button that saves the QR image as a PNG so attendees can print it or save it to their camera roll.

Files: `frontend/src/app/tickets/[id]/page.jsx`

---

**Dark mode for the scanner page**

The `/scan` page is used in low-light environments at event gates. It should have a dark background by default regardless of the user's system preference, to reduce eye strain for the gate staff.

Files: `frontend/src/app/scan/page.jsx`

---

### API server

**Rate limiting on the verify endpoint**

The `POST /api/tickets/verify` endpoint has no rate limiting today. A malicious actor could brute-force ticket IDs. Add rate limiting using `express-rate-limit`: max 60 requests per minute per IP on the verify endpoint.

Files: `api-server/server.js`, `api-server/package.json`

---

**Ticket count in event response**

The `GET /api/events/:id` response should include `ticketsSold`, `totalSupply`, and `ticketsRemaining` fields. These are available from the contract's `get_event()` and `tickets_remaining()` functions. Add them to the serialised response.

Files: `api-server/server.js`

---

### Soroban contract

**`tickets_remaining` function**

Add a contract function `tickets_remaining(event_id: String) -> u32` that returns `total_supply - tickets_sold` without loading the full event struct. This is cheaper for polling.

Files: `contract/src/lib.rs` (new function + test)

---

**Enforce event date on ticket purchase**

`purchase_ticket()` currently does not check whether the event has already happened. Add a check: if `env.ledger().timestamp() > event.event_date + 86400` (one day after the event), reject the purchase with the message `"event has ended"`.

Files: `contract/src/lib.rs` (update `purchase_ticket` + add test)

---

## Bigger features — open for contribution

Open an issue before starting any of these to align on approach and avoid duplicated effort.

### Tiered tickets (VIP / General / Early Bird)

Today every ticket for an event has the same price and is fungible. Many real events have multiple tiers. To support this:

- Add a `tiers: Vec<Tier>` field to the `Event` struct, where `Tier = { name: String, price: i128, supply: u32, sold: u32 }`.
- Update `create_event()` to accept tiers.
- Update `purchase_ticket()` to accept a `tier_name: String` parameter and decrement the right counter.
- On the frontend, show a tier selector on the event page before the buy button.
- Update the QR payload to include `tier`.

---

### Resale marketplace

Allow ticket holders to list tickets for resale at a capped price (no scalping above the original price).

Contract changes:
- Add `list_for_resale(ticket_id, seller, price)` — sets a `ResaleListing` entry.
- Add `buy_resale(ticket_id, buyer, paid_amount)` — validates price, transfers ownership, settles payment, deletes listing.
- Enforce that `price <= original_ticket_price * 1.1` (max 10% markup, configurable by organiser).

Frontend:
- Add a "Resell ticket" button on `/tickets/:id` for valid unused tickets.
- Add a resale section on `/events/:id` showing available resale listings.

---

### Refund flow

When a ticket is cancelled, the buyer should receive an on-chain refund.

Contract changes:
- Add `cancel_ticket(ticket_id, owner)` — sets status to `Cancelled`.
- Add `refund(ticket_id)` — can only be called after cancellation. Transfers `ticket_price` from a contract-held escrow balance back to the `owner` address.

This requires the contract to hold funds. Purchase payments must be directed to the contract address (not the organiser's address directly), and the organiser's earnings held until after the event date, at which point they become withdrawable via `withdraw_revenue(event_id, organiser)`.

---

### Offline verification sync

The current QR verification requires a network call to `POST /api/tickets/verify`. In venues with poor connectivity, this fails. To support offline-first operation:

- The `/scan` page should queue failed network calls in `IndexedDB`.
- When connectivity is restored, replay the queue in order, calling `use_ticket()` for each.
- Display the sync status clearly (e.g. "3 scans pending sync").
- Detect and handle conflicts: if the same ticket was scanned on two devices offline, the second `use_ticket()` call will fail — surface this to the organiser.

---

### Event analytics dashboard

Organisers need to understand their sales. Add a `/dashboard/events/:id/analytics` page showing:

- Tickets sold over time (line chart)
- Revenue in XLM / USDC
- Check-in rate at the gate (used tickets / total sold)
- Time-of-purchase distribution

Pull data from `get_event_tickets()` and compute stats client-side. Use `recharts` or `chart.js` (both are available in the project).

---

### WhatsApp ticket delivery

After a successful ticket purchase, send the attendee's QR code via WhatsApp using the Twilio API. The attendee provides their phone number during purchase.

- Add a `phoneNumber` optional field to the purchase request.
- After the ticket is minted, generate the QR PNG server-side (using `qrcode` npm package) and send it via Twilio's WhatsApp API.
- Never store phone numbers beyond the immediate delivery call.

---

## Working with the QR scanner

The `/scan` page uses the browser's `MediaDevices.getUserMedia()` API to access the camera, and a QR decoding library (`jsQR` or `@zxing/browser`) to decode frames from a `<video>` element.

A few things to keep in mind:

- **HTTPS required** — browsers block camera access on non-HTTPS origins. In development, `localhost` is treated as secure. For any deployed environment, ensure HTTPS is configured.
- **Permission prompt** — the first camera access triggers a browser permission prompt. Do not call `getUserMedia()` on page load; wait for the user to click "Start scanner".
- **Multiple cameras** — mobile devices have front and rear cameras. Default to the rear (`facingMode: "environment"`). The `MediaTrackConstraints` spec is the right place to read about this.
- **Frame rate** — decoding every frame at 60fps is unnecessary and burns CPU. Use `requestAnimationFrame` and decode at most every 200ms.
- **Error handling** — handle `NotAllowedError` (user denied permission) and `NotFoundError` (no camera) separately and show a helpful message for each.

---

## Contract upgrade policy

Soroban contracts are immutable once deployed. There is no upgrade mechanism in the MVP. This means:

- Any change to an existing function's signature is a breaking change that requires redeployment and migration of all existing data.
- New functions can be added without breaking existing behaviour.
- PRs that modify existing contract functions must clearly explain the migration path.
- Before merging any contract change, the full test suite must pass and at least one maintainer must review the diff.

If you are unsure whether a change is breaking, open an issue to discuss it before writing code.

---

## Getting help

- **GitHub Discussions** — architecture questions, feature direction, design decisions.
- **GitHub Issues** — bug reports, concrete feature requests.
- **Stellar Discord** — https://discord.gg/stellardev — active community with Soroban-specific channels.
- **Soroban docs** — https://soroban.stellar.org/docs
- **Stellar Stack Exchange** — https://stellar.stackexchange.com
