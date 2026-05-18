#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::Address as _, Address, Env, String,
};

fn setup<'a>() -> (Env, StellarTicketClient<'a>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(StellarTicket, ());
    let client = StellarTicketClient::new(&env, &contract_id);
    let organiser = Address::generate(&env);
    let buyer = Address::generate(&env);
    (env, client, organiser, buyer)
}

fn make_event(env: &Env, client: &StellarTicketClient, organiser: &Address, supply: u32) -> String {
    let id = String::from_str(env, "evt_001");
    client.create_event(
        &id,
        organiser,
        &String::from_str(env, "Lagos Tech Summit"),
        &String::from_str(env, "Annual conference"),
        &String::from_str(env, "Eko Hotel"),
        &1_750_000_000u64,
        &100_000_000i128,
        &String::from_str(env, "XLM"),
        &supply,
    );
    id
}

#[test]
fn create_and_fetch_event() {
    let (env, client, organiser, _) = setup();
    let id = make_event(&env, &client, &organiser, 5);
    let e = client.get_event(&id);
    assert_eq!(e.total_supply, 5);
    assert_eq!(e.tickets_sold, 0);
    assert_eq!(e.organiser, organiser);
    assert_eq!(client.tickets_remaining(&id), 5);
    let ev_ids = client.get_organiser_events(&organiser);
    assert_eq!(ev_ids.len(), 1);
}

#[test]
fn purchase_and_use_ticket() {
    let (env, client, organiser, buyer) = setup();
    let event_id = make_event(&env, &client, &organiser, 2);
    let ticket_id = String::from_str(&env, "tkt_001");

    let t = client.purchase_ticket(&ticket_id, &event_id, &buyer, &100_000_000i128);
    assert_eq!(t.owner, buyer);
    assert_eq!(t.status, TicketStatus::Valid);
    assert_eq!(client.tickets_remaining(&event_id), 1);

    let used = client.use_ticket(&ticket_id, &organiser);
    assert_eq!(used.status, TicketStatus::Used);
    assert!(client.is_used(&ticket_id));
}

#[test]
fn double_use_is_rejected() {
    let (env, client, organiser, buyer) = setup();
    let event_id = make_event(&env, &client, &organiser, 2);
    let ticket_id = String::from_str(&env, "tkt_dbl");
    client.purchase_ticket(&ticket_id, &event_id, &buyer, &100_000_000i128);
    client.use_ticket(&ticket_id, &organiser);
    let err = client.try_use_ticket(&ticket_id, &organiser).unwrap_err();
    assert_eq!(err, Ok(Error::AlreadyUsed));
}

#[test]
fn sold_out_is_enforced() {
    let (env, client, organiser, buyer) = setup();
    let event_id = make_event(&env, &client, &organiser, 1);
    client.purchase_ticket(
        &String::from_str(&env, "tkt_a"),
        &event_id,
        &buyer,
        &100_000_000i128,
    );
    let err = client
        .try_purchase_ticket(
            &String::from_str(&env, "tkt_b"),
            &event_id,
            &buyer,
            &100_000_000i128,
        )
        .unwrap_err();
    assert_eq!(err, Ok(Error::SoldOut));
}

#[test]
fn insufficient_payment_is_rejected() {
    let (env, client, organiser, buyer) = setup();
    let event_id = make_event(&env, &client, &organiser, 5);
    let err = client
        .try_purchase_ticket(
            &String::from_str(&env, "tkt_z"),
            &event_id,
            &buyer,
            &50_000_000i128,
        )
        .unwrap_err();
    assert_eq!(err, Ok(Error::InsufficientPayment));
}

#[test]
fn cancel_ticket_blocks_use() {
    let (env, client, organiser, buyer) = setup();
    let event_id = make_event(&env, &client, &organiser, 5);
    let tkt = String::from_str(&env, "tkt_cancel");
    client.purchase_ticket(&tkt, &event_id, &buyer, &100_000_000i128);
    let cancelled = client.cancel_ticket(&tkt, &buyer);
    assert_eq!(cancelled.status, TicketStatus::Cancelled);
    let err = client.try_use_ticket(&tkt, &organiser).unwrap_err();
    assert_eq!(err, Ok(Error::AlreadyCancelled));
}

#[test]
fn non_organiser_cannot_use_ticket() {
    let (env, client, organiser, buyer) = setup();
    let event_id = make_event(&env, &client, &organiser, 1);
    let tkt = String::from_str(&env, "tkt_x");
    client.purchase_ticket(&tkt, &event_id, &buyer, &100_000_000i128);
    let stranger = Address::generate(&env);
    let err = client.try_use_ticket(&tkt, &stranger).unwrap_err();
    assert_eq!(err, Ok(Error::NotOrganiser));
}

#[test]
fn cancel_event_blocks_purchase() {
    let (env, client, organiser, buyer) = setup();
    let event_id = make_event(&env, &client, &organiser, 5);
    client.cancel_event(&event_id, &organiser);
    let err = client
        .try_purchase_ticket(
            &String::from_str(&env, "tkt_late"),
            &event_id,
            &buyer,
            &100_000_000i128,
        )
        .unwrap_err();
    assert_eq!(err, Ok(Error::EventCancelled));
}
