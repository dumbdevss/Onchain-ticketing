"use client"

import { Alert, Button, Card, Loader } from "@stellar/design-system"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useWallet } from "../hooks/useWallet"
import { formatDate, makeId, shortAddr, stroopsToXlm } from "../lib/format"
import { getEvent, purchaseTicket, ticketsRemaining } from "../lib/ticketing"
import styles from "./Ticketing.module.css"

export default function EventDetail() {
	const params = useParams<{ id: string }>()
	const id = params?.id ?? ""
	const { address } = useWallet()
	const router = useRouter()
	const [buying, setBuying] = useState(false)
	const [buyError, setBuyError] = useState<string | null>(null)

	const eventQuery = useQuery({
		queryKey: ["event", id],
		queryFn: () => getEvent(id),
		enabled: Boolean(id),
	})

	const remainingQuery = useQuery({
		queryKey: ["event", id, "remaining"],
		queryFn: () => ticketsRemaining(id),
		enabled: Boolean(id),
	})

	async function buy() {
		if (!address || !eventQuery.data) return
		setBuying(true)
		setBuyError(null)
		try {
			const ticketId = makeId("tkt")
			await purchaseTicket({
				ticketId,
				eventId: id,
				buyer: address,
				paidAmount: eventQuery.data.ticket_price,
			})
			router.push(`/tickets/${ticketId}`)
		} catch (e) {
			console.error(e)
			setBuyError(e instanceof Error ? e.message : "Purchase failed")
		} finally {
			setBuying(false)
		}
	}

	if (eventQuery.isLoading) {
		return (
			<div className={styles.page}>
				<Loader size="2rem" /> Loading event…
			</div>
		)
	}

	if (eventQuery.isError || !eventQuery.data) {
		return (
			<div className={styles.page}>
				<Alert variant="error" placement="inline" title="Event not found">
					Could not load event <code>{id}</code>.{" "}
					{eventQuery.error instanceof Error ? eventQuery.error.message : ""}
				</Alert>
				<Link href="/" className="Link Link--primary">
					← Back home
				</Link>
			</div>
		)
	}

	const e = eventQuery.data
	const remaining =
		remainingQuery.data ?? Math.max(0, e.total_supply - e.tickets_sold)
	const soldOut = remaining <= 0
	const cancelled = e.is_cancelled

	return (
		<div className={styles.page}>
			<header>
				<h1>{e.name}</h1>
				<p className={styles.muted}>{e.description}</p>
			</header>

			<Card>
				<dl className={styles.metaList}>
					<dt>Venue</dt>
					<dd>{e.venue}</dd>
					<dt>Date</dt>
					<dd>{formatDate(e.event_date)}</dd>
					<dt>Price</dt>
					<dd>
						{stroopsToXlm(e.ticket_price)} {e.ticket_asset}
					</dd>
					<dt>Remaining</dt>
					<dd>
						{remaining} / {e.total_supply}
					</dd>
					<dt>Organiser</dt>
					<dd>
						<code>{shortAddr(e.organiser)}</code>
					</dd>
					<dt>Event ID</dt>
					<dd>
						<code>{e.id}</code>
					</dd>
				</dl>
			</Card>

			{cancelled && (
				<Alert variant="error" placement="inline" title="Event cancelled">
					This event has been cancelled by the organiser.
				</Alert>
			)}

			{buyError && (
				<Alert variant="error" placement="inline" title="Purchase failed">
					{buyError}
				</Alert>
			)}

			<Card>
				<h2>Buy a ticket</h2>
				<p className={styles.muted}>
					Connect a wallet, then mint your ticket on-chain. You'll receive a
					unique ticket ID + QR code.
				</p>
				<div className={styles.actions}>
					<Button
						variant="primary"
						size="lg"
						disabled={!address || soldOut || cancelled || buying}
						isLoading={buying}
						onClick={buy}
					>
						{!address
							? "Connect wallet to buy"
							: soldOut
								? "Sold out"
								: cancelled
									? "Cancelled"
									: `Buy for ${stroopsToXlm(e.ticket_price)} ${e.ticket_asset}`}
					</Button>
					{address === e.organiser && (
						<Link href="/dashboard">
							<Button variant="tertiary" size="lg">
								Manage event
							</Button>
						</Link>
					)}
				</div>
			</Card>
		</div>
	)
}
