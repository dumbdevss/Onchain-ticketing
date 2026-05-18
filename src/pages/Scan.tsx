"use client"

import { Alert, Button, Card, Input } from "@stellar/design-system"
import { useEffect, useRef, useState } from "react"
import { useWallet } from "../hooks/useWallet"
import { shortAddr } from "../lib/format"
import {
	decodeQrPayload,
	verifyTicket,
	type SignedTicketPayload,
} from "../lib/qr"
import { markTicketUsed } from "../lib/ticketing"
import styles from "./Ticketing.module.css"

type Outcome =
	| { kind: "ok"; payload: SignedTicketPayload }
	| { kind: "bad-sig" }
	| { kind: "bad-format" }
	| { kind: "already-used"; payload: SignedTicketPayload }
	| { kind: "error"; message: string }

interface BarcodeDetectorLike {
	detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}

interface BarcodeDetectorCtor {
	new (opts: { formats: string[] }): BarcodeDetectorLike
}

function getBarcodeDetector(): BarcodeDetectorCtor | null {
	const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
	return w.BarcodeDetector ?? null
}

export default function Scan() {
	const { address } = useWallet()
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const stopRef = useRef(false)
	const [outcome, setOutcome] = useState<Outcome | null>(null)
	const [scanning, setScanning] = useState(false)
	const [manual, setManual] = useState("")
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		return () => {
			stopRef.current = true
			streamRef.current?.getTracks().forEach((t) => t.stop())
		}
	}, [])

	async function handlePayload(raw: string) {
		setBusy(true)
		try {
			const decoded = decodeQrPayload(raw)
			if (!decoded) {
				setOutcome({ kind: "bad-format" })
				return
			}
			const ok = await verifyTicket(decoded)
			if (!ok) {
				setOutcome({ kind: "bad-sig" })
				return
			}
			if (!address) {
				setOutcome({
					kind: "error",
					message: "Connect the organiser wallet to verify on-chain.",
				})
				return
			}
			try {
				await markTicketUsed({
					ticketId: decoded.ticketId,
					verifier: address,
				})
				setOutcome({ kind: "ok", payload: decoded })
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e)
				if (/AlreadyUsed/i.test(msg)) {
					setOutcome({ kind: "already-used", payload: decoded })
				} else {
					setOutcome({ kind: "error", message: msg })
				}
			}
		} finally {
			setBusy(false)
		}
	}

	async function startCamera() {
		setOutcome(null)
		const Detector = getBarcodeDetector()
		if (!Detector) {
			setOutcome({
				kind: "error",
				message:
					"Your browser does not support BarcodeDetector. Use the manual paste field below, or try Chrome/Edge on Android.",
			})
			return
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "environment" },
			})
			streamRef.current = stream
			if (videoRef.current) {
				videoRef.current.srcObject = stream
				await videoRef.current.play()
			}
			setScanning(true)
			stopRef.current = false
			const detector = new Detector({ formats: ["qr_code"] })
			const tick = async () => {
				if (stopRef.current || !videoRef.current) return
				try {
					const codes = await detector.detect(videoRef.current)
					if (codes[0]?.rawValue) {
						stopRef.current = true
						stream.getTracks().forEach((t) => t.stop())
						setScanning(false)
						await handlePayload(codes[0].rawValue)
						return
					}
				} catch {
					// ignore per-frame failures
				}
				requestAnimationFrame(() => void tick())
			}
			void tick()
		} catch (e) {
			setOutcome({
				kind: "error",
				message: e instanceof Error ? e.message : "Camera access denied",
			})
		}
	}

	function stopCamera() {
		stopRef.current = true
		streamRef.current?.getTracks().forEach((t) => t.stop())
		setScanning(false)
	}

	return (
		<div className={styles.page}>
			<header>
				<h1>Gate scanner</h1>
				<p className={styles.muted}>
					Scan an attendee's QR code or paste the JSON payload. Connect with the
					organiser wallet to mark tickets as used on-chain.
				</p>
			</header>

			{!address && (
				<Alert variant="warning" placement="inline" title="Wallet required">
					Connect the organiser wallet to verify on-chain.
				</Alert>
			)}

			<Card>
				<div className={styles.scannerWrap}>
					<video ref={videoRef} muted playsInline />
					<div className={styles.actions}>
						{!scanning ? (
							<Button variant="primary" size="lg" onClick={startCamera}>
								Start camera
							</Button>
						) : (
							<Button variant="tertiary" size="lg" onClick={stopCamera}>
								Stop camera
							</Button>
						)}
					</div>
				</div>
			</Card>

			<Card>
				<h2>Manual paste</h2>
				<form
					action={(formData) => {
						const raw = String(formData.get("payload") ?? "")
						if (raw.trim()) void handlePayload(raw.trim())
					}}
					className={styles.form}
				>
					<Input
						id="payload"
						label="Signed payload JSON"
						placeholder='{"ticketId":"…","eventId":"…","owner":"…","issuedAt":…,"sig":"…"}'
						value={manual}
						onChange={(e) => setManual(e.target.value)}
						fieldSize="md"
					/>
					<Button type="submit" variant="secondary" size="md" disabled={busy}>
						Verify
					</Button>
				</form>
			</Card>

			{outcome?.kind === "ok" && (
				<div className={`${styles.statusBanner} ${styles.statusOk}`}>
					<strong>✅ Valid ticket — entry granted</strong>
					<span>
						<code>{outcome.payload.ticketId}</code> · owner{" "}
						<code>{shortAddr(outcome.payload.owner)}</code>
					</span>
				</div>
			)}
			{outcome?.kind === "already-used" && (
				<div className={`${styles.statusBanner} ${styles.statusErr}`}>
					<strong>⛔ Already used</strong>
					<span>
						<code>{outcome.payload.ticketId}</code>
					</span>
				</div>
			)}
			{outcome?.kind === "bad-sig" && (
				<div className={`${styles.statusBanner} ${styles.statusErr}`}>
					<strong>⛔ Invalid signature</strong>
				</div>
			)}
			{outcome?.kind === "bad-format" && (
				<div className={`${styles.statusBanner} ${styles.statusErr}`}>
					<strong>⛔ Unrecognised payload format</strong>
				</div>
			)}
			{outcome?.kind === "error" && (
				<Alert variant="error" placement="inline" title="Verification failed">
					{outcome.message}
				</Alert>
			)}
		</div>
	)
}
