"use client"

import { Alert, Button, Card, Loader } from "@stellar/design-system"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useWallet } from "../hooks/useWallet"
import { formatDate, stroopsToXlm } from "../lib/format"
import {
	getEvent,
	getOrganiserEvents,
	type TicketingEvent,
} from "../lib/ticketing"
import styles from "./Ticketing.module.css"

export default function Dashboard() {
	const { address } = useWallet()

	const eventsQuery = useQuery({
		queryKey: ["organiserEvents", address],
		queryFn: async (): Promise<TicketingEvent[]> => {
			if (!address) return []
			const ids = await getOrganiserEvents(address)
			const events = await Promise.all(
				ids.map((id) => getEvent(id).catch(() => null)),
			)
			return events.filter((e): e is TicketingEvent => e !== null)
		},
		enabled: Boolean(address),
	})

	if (!address) {
		return (
			<div className={styles.page}>
				<Alert variant="warning" placement="inline" title="Wallet required">
					Connect a wallet to view your events.
				</Alert>
			</div>
		)
	}

	return (
		<div className={styles.page}>
			<header>
				<h1>Organiser dashboard</h1>
				<p className={styles.muted}>
					All events you've created with the connected wallet.
				</p>
			</header>

			<div className={styles.actions}>
				<Link href="/events/create">
					<Button variant="primary" size="md">
						+ Create event
					</Button>
				</Link>
				<Link href="/scan">
					<Button variant="tertiary" size="md">
						Open gate scanner
					</Button>
				</Link>
			</div>

			{eventsQuery.isLoading && (
				<>
					<Loader size="2rem" /> Loading…
				</>
			)}

			{eventsQuery.isError && (
				<Alert variant="error" placement="inline" title="Failed to load events">
					{eventsQuery.error instanceof Error
						? eventsQuery.error.message
						: "Unknown error"}
				</Alert>
			)}

			{eventsQuery.data && eventsQuery.data.length === 0 && (
				<Card>
					<p>You haven't created any events yet.</p>
				</Card>
			)}

			<div className={styles.eventList}>
				{eventsQuery.data?.map((e) => (
					<Card key={e.id}>
						<div className={styles.eventCard}>
							<h3>{e.name}</h3>
							<p className={styles.muted}>{e.venue}</p>
							<p>{formatDate(e.event_date)}</p>
							<p>
								<strong>
									{e.tickets_sold} / {e.total_supply}
								</strong>{" "}
								sold · {stroopsToXlm(e.ticket_price)} {e.ticket_asset} each
							</p>
							{e.is_cancelled && <p style={{ color: "crimson" }}>Cancelled</p>}
							<div className={styles.actions}>
								<Link href={`/events/${e.id}`}>
									<Button variant="secondary" size="sm">
										View page
									</Button>
								</Link>
							</div>
						</div>
					</Card>
				))}
			</div>
		</div>
	)
}
