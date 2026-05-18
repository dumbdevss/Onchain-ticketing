"use client"

import { Alert, Button, Card, Loader } from "@stellar/design-system"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { formatDate, shortAddr } from "../lib/format"
import {
	encodeQrPayload,
	qrImageUrl,
	signTicket,
	type SignedTicketPayload,
} from "../lib/qr"
import { getTicket } from "../lib/ticketing"
import styles from "./Ticketing.module.css"

export default function TicketDetail() {
	const params = useParams<{ id: string }>()
	const id = params?.id ?? ""
	const [payload, setPayload] = useState<SignedTicketPayload | null>(null)

	const ticketQuery = useQuery({
		queryKey: ["ticket", id],
		queryFn: () => getTicket(id),
		enabled: Boolean(id),
	})

	useEffect(() => {
		if (!ticketQuery.data) return
		const t = ticketQuery.data
		void signTicket({
			ticketId: t.id,
			eventId: t.event_id,
			owner: t.owner,
			issuedAt: Math.floor(Date.now() / 1000),
		}).then(setPayload)
	}, [ticketQuery.data])

	if (ticketQuery.isLoading) {
		return (
			<div className={styles.page}>
				<Loader size="2rem" /> Loading ticket…
			</div>
		)
	}

	if (ticketQuery.isError || !ticketQuery.data) {
		return (
			<div className={styles.page}>
				<Alert variant="error" placement="inline" title="Ticket not found">
					Could not load ticket <code>{id}</code>.
				</Alert>
				<Link href="/" className="Link Link--primary">
					← Back home
				</Link>
			</div>
		)
	}

	const t = ticketQuery.data
	const isUsed = t.status === "Used"
	const isInvalid = t.status === "Cancelled" || t.status === "Refunded"

	return (
		<div className={styles.page}>
			<header>
				<h1>Your ticket</h1>
				<p className={styles.muted}>
					Show this QR code at the gate. The organiser scans it to verify and
					mark it used.
				</p>
			</header>

			{isUsed && (
				<Alert variant="warning" placement="inline" title="Ticket already used">
					Used at {t.used_at ? formatDate(t.used_at) : "—"}.
				</Alert>
			)}
			{isInvalid && (
				<Alert variant="error" placement="inline" title="Ticket invalid">
					Status: {t.status}.
				</Alert>
			)}

			<Card>
				<div className={styles.qrWrap}>
					{payload ? (
						<>
							<img
								src={qrImageUrl(encodeQrPayload(payload))}
								alt="Ticket QR code"
								width={320}
								height={320}
							/>
							<details>
								<summary>Show payload</summary>
								<pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
									{encodeQrPayload(payload)}
								</pre>
							</details>
						</>
					) : (
						<>
							<Loader size="2rem" /> Generating signed QR…
						</>
					)}
				</div>
			</Card>

			<Card>
				<dl className={styles.metaList}>
					<dt>Ticket ID</dt>
					<dd>
						<code>{t.id}</code>
					</dd>
					<dt>Event ID</dt>
					<dd>
						<Link href={`/events/${t.event_id}`}>
							<code>{t.event_id}</code>
						</Link>
					</dd>
					<dt>Owner</dt>
					<dd>
						<code>{shortAddr(t.owner)}</code>
					</dd>
					<dt>Status</dt>
					<dd>{t.status}</dd>
					<dt>Purchased</dt>
					<dd>{formatDate(t.purchased_at)}</dd>
				</dl>
			</Card>

			<div className={styles.actions}>
				<Button
					variant="tertiary"
					size="md"
					onClick={() => {
						if (!payload) return
						const blob = new Blob([encodeQrPayload(payload)], {
							type: "application/json",
						})
						const url = URL.createObjectURL(blob)
						const a = document.createElement("a")
						a.href = url
						a.download = `${t.id}.json`
						a.click()
						URL.revokeObjectURL(url)
					}}
					disabled={!payload}
				>
					Download payload
				</Button>
			</div>
		</div>
	)
}
