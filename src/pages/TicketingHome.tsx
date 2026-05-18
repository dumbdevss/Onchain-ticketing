"use client"

import { Button, Card, Icon } from "@stellar/design-system"
import Link from "next/link"
import styles from "./Ticketing.module.css"

export default function TicketingHome() {
	return (
		<div className={styles.page}>
			<div>
				<h1>StellarTicket</h1>
				<p>
					On-chain event ticketing on Stellar. Mint a ticket supply, sell to
					attendees, and verify entry at the gate with a single QR scan — all
					backed by a Soroban smart contract.
				</p>
			</div>

			<div className={styles.heroGrid}>
				<Card>
					<Icon.Calendar size="lg" />
					<h3>Create an event</h3>
					<p className={styles.muted}>
						Deploy your event on-chain in seconds. Set your venue, date, price
						and supply.
					</p>
					<Link href="/events/create">
						<Button variant="primary" size="md">
							New event
						</Button>
					</Link>
				</Card>
				<Card>
					<Icon.Ticket01 size="lg" />
					<h3>Buy a ticket</h3>
					<p className={styles.muted}>
						Open an event link from an organiser, connect your wallet, and mint
						your ticket.
					</p>
					<p>
						<small>Need an event link? Ask the organiser.</small>
					</p>
				</Card>
				<Card>
					<Icon.Scan size="lg" />
					<h3>Scan at the gate</h3>
					<p className={styles.muted}>
						Verify attendee QR codes using your phone's camera. Each ticket can
						only be used once.
					</p>
					<Link href="/scan">
						<Button variant="secondary" size="md">
							Open scanner
						</Button>
					</Link>
				</Card>
				<Card>
					<Icon.BarChartSquareUp size="lg" />
					<h3>Organiser dashboard</h3>
					<p className={styles.muted}>
						See all events your wallet has organised, sold counts, and quick
						actions.
					</p>
					<Link href="/dashboard">
						<Button variant="tertiary" size="md">
							Open dashboard
						</Button>
					</Link>
				</Card>
			</div>

			<Card>
				<h2>How it works</h2>
				<ol>
					<li>Organiser connects Freighter and creates the event on-chain.</li>
					<li>
						Attendee opens the event link, connects their wallet, and pays for a
						ticket.
					</li>
					<li>
						The contract mints a ticket bound to the buyer's address and returns
						a unique ID.
					</li>
					<li>
						The attendee shows the QR code at the gate; the organiser scans it;
						the contract marks it used.
					</li>
				</ol>
			</Card>
		</div>
	)
}
