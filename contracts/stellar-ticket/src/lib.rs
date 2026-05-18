#![no_std]
//! StellarTicket — on-chain event ticketing.
//!
//! An event organiser creates an event with a fixed ticket supply.
//! Attendees `purchase_ticket` to mint a unique ticket bound to their address.
//! At the gate, the organiser scans the attendee's QR code and the contract
//! marks the ticket as used, preventing double-entry.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    EventNotFound = 1,
    TicketNotFound = 2,
    EventCancelled = 3,
    SoldOut = 4,
    InsufficientPayment = 5,
    NotOrganiser = 6,
    NotOwner = 7,
    AlreadyUsed = 8,
    AlreadyCancelled = 9,
    EventAlreadyExists = 10,
    TicketAlreadyExists = 11,
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TicketStatus {
    Valid = 0,
    Used = 1,
    Cancelled = 2,
    Refunded = 3,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Event {
    pub id: String,
    pub organiser: Address,
    pub name: String,
    pub description: String,
    pub venue: String,
    pub event_date: u64,
    pub ticket_price: i128,
    pub ticket_asset: String,
    pub total_supply: u32,
    pub tickets_sold: u32,
    pub created_at: u64,
    pub is_cancelled: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Ticket {
    pub id: String,
    pub event_id: String,
    pub owner: Address,
    pub status: TicketStatus,
    pub purchased_at: u64,
    pub used_at: Option<u64>,
    pub seat_or_tier: Option<String>,
    pub tx_hash: String,
}

#[contracttype]
pub enum DataKey {
    Event(String),
    Ticket(String),
    EventTickets(String),
    OrganiserEvents(Address),
}

#[contract]
pub struct StellarTicket;

#[contractimpl]
impl StellarTicket {
    /// Create a new event. The `organiser` is the only one who can later mark
    /// tickets as used or cancel the event.
    pub fn create_event(
        env: Env,
        id: String,
        organiser: Address,
        name: String,
        description: String,
        venue: String,
        event_date: u64,
        ticket_price: i128,
        ticket_asset: String,
        total_supply: u32,
    ) -> Result<Event, Error> {
        organiser.require_auth();

        let key = DataKey::Event(id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::EventAlreadyExists);
        }

        let event = Event {
            id: id.clone(),
            organiser: organiser.clone(),
            name,
            description,
            venue,
            event_date,
            ticket_price,
            ticket_asset,
            total_supply,
            tickets_sold: 0,
            created_at: env.ledger().timestamp(),
            is_cancelled: false,
        };

        env.storage().persistent().set(&key, &event);

        let tickets_key = DataKey::EventTickets(id.clone());
        let empty: Vec<String> = Vec::new(&env);
        env.storage().persistent().set(&tickets_key, &empty);

        let org_key = DataKey::OrganiserEvents(organiser);
        let mut events: Vec<String> = env
            .storage()
            .persistent()
            .get(&org_key)
            .unwrap_or(Vec::new(&env));
        events.push_back(id);
        env.storage().persistent().set(&org_key, &events);

        Ok(event)
    }

    /// Mint a single ticket for the buyer. `paid_amount` must meet or exceed
    /// the ticket price. The actual XLM/USDC transfer is expected to happen
    /// upstream (handled by the API/x402 flow); this only records the mint.
    pub fn purchase_ticket(
        env: Env,
        ticket_id: String,
        event_id: String,
        buyer: Address,
        paid_amount: i128,
    ) -> Result<Ticket, Error> {
        buyer.require_auth();

        let event_key = DataKey::Event(event_id.clone());
        let mut event: Event = env
            .storage()
            .persistent()
            .get(&event_key)
            .ok_or(Error::EventNotFound)?;

        if event.is_cancelled {
            return Err(Error::EventCancelled);
        }
        if event.tickets_sold >= event.total_supply {
            return Err(Error::SoldOut);
        }
        if paid_amount < event.ticket_price {
            return Err(Error::InsufficientPayment);
        }

        let ticket_key = DataKey::Ticket(ticket_id.clone());
        if env.storage().persistent().has(&ticket_key) {
            return Err(Error::TicketAlreadyExists);
        }

        let ticket = Ticket {
            id: ticket_id.clone(),
            event_id: event_id.clone(),
            owner: buyer,
            status: TicketStatus::Valid,
            purchased_at: env.ledger().timestamp(),
            used_at: None,
            seat_or_tier: None,
            tx_hash: String::from_str(&env, ""),
        };

        env.storage().persistent().set(&ticket_key, &ticket);

        event.tickets_sold += 1;
        env.storage().persistent().set(&event_key, &event);

        let tickets_key = DataKey::EventTickets(event_id);
        let mut tickets: Vec<String> = env
            .storage()
            .persistent()
            .get(&tickets_key)
            .unwrap_or(Vec::new(&env));
        tickets.push_back(ticket_id);
        env.storage().persistent().set(&tickets_key, &tickets);

        Ok(ticket)
    }

    /// Mark a ticket as used at the gate. Only the event's organiser may call.
    pub fn use_ticket(env: Env, ticket_id: String, verifier: Address) -> Result<Ticket, Error> {
        verifier.require_auth();

        let ticket_key = DataKey::Ticket(ticket_id);
        let mut ticket: Ticket = env
            .storage()
            .persistent()
            .get(&ticket_key)
            .ok_or(Error::TicketNotFound)?;

        let event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(ticket.event_id.clone()))
            .ok_or(Error::EventNotFound)?;

        if event.organiser != verifier {
            return Err(Error::NotOrganiser);
        }

        match ticket.status {
            TicketStatus::Used => return Err(Error::AlreadyUsed),
            TicketStatus::Cancelled | TicketStatus::Refunded => {
                return Err(Error::AlreadyCancelled);
            }
            TicketStatus::Valid => {}
        }

        ticket.status = TicketStatus::Used;
        ticket.used_at = Some(env.ledger().timestamp());
        env.storage().persistent().set(&ticket_key, &ticket);
        Ok(ticket)
    }

    /// Cancel a ticket. Only the ticket owner may cancel.
    pub fn cancel_ticket(env: Env, ticket_id: String, owner: Address) -> Result<Ticket, Error> {
        owner.require_auth();

        let ticket_key = DataKey::Ticket(ticket_id);
        let mut ticket: Ticket = env
            .storage()
            .persistent()
            .get(&ticket_key)
            .ok_or(Error::TicketNotFound)?;

        if ticket.owner != owner {
            return Err(Error::NotOwner);
        }

        match ticket.status {
            TicketStatus::Used => return Err(Error::AlreadyUsed),
            TicketStatus::Cancelled | TicketStatus::Refunded => {
                return Err(Error::AlreadyCancelled);
            }
            TicketStatus::Valid => {}
        }

        ticket.status = TicketStatus::Cancelled;
        env.storage().persistent().set(&ticket_key, &ticket);
        Ok(ticket)
    }

    /// Cancel an entire event. Only callable by its organiser.
    pub fn cancel_event(env: Env, event_id: String, organiser: Address) -> Result<Event, Error> {
        organiser.require_auth();
        let key = DataKey::Event(event_id);
        let mut event: Event = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::EventNotFound)?;
        if event.organiser != organiser {
            return Err(Error::NotOrganiser);
        }
        event.is_cancelled = true;
        env.storage().persistent().set(&key, &event);
        Ok(event)
    }

    pub fn get_event(env: Env, event_id: String) -> Result<Event, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)
    }

    pub fn get_ticket(env: Env, ticket_id: String) -> Result<Ticket, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id))
            .ok_or(Error::TicketNotFound)
    }

    pub fn is_used(env: Env, ticket_id: String) -> Result<bool, Error> {
        let t: Ticket = env
            .storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id))
            .ok_or(Error::TicketNotFound)?;
        Ok(matches!(t.status, TicketStatus::Used))
    }

    pub fn get_event_tickets(env: Env, event_id: String) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::EventTickets(event_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_organiser_events(env: Env, organiser: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::OrganiserEvents(organiser))
            .unwrap_or(Vec::new(&env))
    }

    pub fn tickets_remaining(env: Env, event_id: String) -> Result<u32, Error> {
        let e: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;
        Ok(e.total_supply - e.tickets_sold)
    }
}

mod test;
