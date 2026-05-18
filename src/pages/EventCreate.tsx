"use client"

import { Alert, Button, Card, Input } from "@stellar/design-system"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useWallet } from "../hooks/useWallet"
import { makeId, xlmToStroops } from "../lib/format"
import { createEvent } from "../lib/ticketing"
import styles from "./Ticketing.module.css"

export default function EventCreate() {
	const { address } = useWallet()
	const router = useRouter()
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function onSubmit(formData: FormData) {
		if (!address) {
			setError("Connect a wallet first.")
			return
		}
		setError(null)
		setSubmitting(true)
		try {
			const id = makeId("evt")
			const eventDateInput = formData.get("event_date") as string
			const eventDate = BigInt(
				Math.floor(new Date(eventDateInput).getTime() / 1000),
			)
			const ticketPrice = xlmToStroops(
				(formData.get("ticket_price") as string) || "0",
			)
			await createEvent({
				id,
				organiser: address,
				name: String(formData.get("name") ?? ""),
				description: String(formData.get("description") ?? ""),
				venue: String(formData.get("venue") ?? ""),
				eventDate,
				ticketPrice,
				ticketAsset: String(formData.get("ticket_asset") ?? "XLM"),
				totalSupply: Number(formData.get("total_supply") ?? 0),
			})
			router.push(`/events/${id}`)
		} catch (e) {
			console.error(e)
			setError(e instanceof Error ? e.message : "Failed to create event")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className={styles.page}>
			<header>
				<h1>Create event</h1>
				<p className={styles.muted}>
					Mint your event's ticket supply on Stellar. The connected wallet
					becomes the event organiser.
				</p>
			</header>

			{!address && (
				<Alert variant="warning" placement="inline" title="Wallet required">
					Connect a wallet from the top-right to create an event.{" "}
					<Link href="/" className="Link Link--primary">
						Back home
					</Link>
				</Alert>
			)}

			{error && (
				<Alert
					variant="error"
					placement="inline"
					title="Could not create event"
				>
					{error}
				</Alert>
			)}

			<Card>
				<form action={onSubmit} className={styles.form}>
					<Input
						id="name"
						label="Event name"
						placeholder="Lagos Tech Summit 2025"
						required
						fieldSize="md"
					/>
					<Input
						id="description"
						label="Description"
						placeholder="Annual technology conference"
						fieldSize="md"
					/>
					<Input
						id="venue"
						label="Venue"
						placeholder="Eko Hotel, Lagos"
						required
						fieldSize="md"
					/>
					<div className={styles.formRow}>
						<Input
							id="event_date"
							label="Event date"
							type="datetime-local"
							required
							fieldSize="md"
						/>
						<Input
							id="total_supply"
							label="Ticket supply"
							type="number"
							min={1}
							defaultValue="100"
							required
							fieldSize="md"
						/>
					</div>
					<div className={styles.formRow}>
						<Input
							id="ticket_price"
							label="Ticket price"
							type="number"
							step="0.0000001"
							min={0}
							defaultValue="10"
							required
							fieldSize="md"
						/>
						<Input
							id="ticket_asset"
							label="Asset"
							defaultValue="XLM"
							fieldSize="md"
						/>
					</div>
					<Button
						type="submit"
						variant="primary"
						size="lg"
						disabled={!address || submitting}
						isLoading={submitting}
					>
						{submitting ? "Submitting…" : "Create event"}
					</Button>
				</form>
			</Card>
		</div>
	)
}
