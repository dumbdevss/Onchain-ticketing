/**
 * QR payload signing/verification.
 *
 * Each ticket QR encodes a JSON payload + an HMAC-SHA256 signature. The
 * signature lets the gate scanner verify authenticity without a network
 * call (offline-capable). For demo purposes the secret is read from the
 * env var `PUBLIC_QR_SECRET` — in production this would live on the
 * backend signing service.
 */

export interface SignedTicketPayload {
	ticketId: string
	eventId: string
	owner: string
	issuedAt: number
	sig: string
}

const SECRET = process.env.NEXT_PUBLIC_QR_SECRET ?? "stellar-ticket-demo-secret"

function toHex(buf: ArrayBuffer): string {
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

function bytes(s: string): ArrayBuffer {
	// Web Crypto under newer TS lib types requires a strict `ArrayBuffer` (not
	// `SharedArrayBuffer`). Copy the encoded bytes into a fresh ArrayBuffer.
	const enc = new TextEncoder().encode(s)
	const buf = new ArrayBuffer(enc.byteLength)
	new Uint8Array(buf).set(enc)
	return buf
}

function hexToBuffer(hex: string): ArrayBuffer {
	const parsed = hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? []
	const buf = new ArrayBuffer(parsed.length)
	new Uint8Array(buf).set(parsed)
	return buf
}

async function importKey(): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		bytes(SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	)
}

function payloadString(p: Omit<SignedTicketPayload, "sig">): string {
	return `${p.ticketId}|${p.eventId}|${p.owner}|${p.issuedAt}`
}

export async function signTicket(
	p: Omit<SignedTicketPayload, "sig">,
): Promise<SignedTicketPayload> {
	const key = await importKey()
	const sig = await crypto.subtle.sign("HMAC", key, bytes(payloadString(p)))
	return { ...p, sig: toHex(sig) }
}

export async function verifyTicket(p: SignedTicketPayload): Promise<boolean> {
	const key = await importKey()
	return crypto.subtle.verify(
		"HMAC",
		key,
		hexToBuffer(p.sig),
		bytes(payloadString(p)),
	)
}

export function encodeQrPayload(p: SignedTicketPayload): string {
	return JSON.stringify(p)
}

export function decodeQrPayload(raw: string): SignedTicketPayload | null {
	try {
		const obj = JSON.parse(raw) as Partial<SignedTicketPayload>
		if (
			typeof obj.ticketId !== "string" ||
			typeof obj.eventId !== "string" ||
			typeof obj.owner !== "string" ||
			typeof obj.issuedAt !== "number" ||
			typeof obj.sig !== "string"
		) {
			return null
		}
		return obj as SignedTicketPayload
	} catch {
		return null
	}
}

/**
 * Build a QR-code image URL for a payload using a public renderer.
 * No npm dependency required; works fully offline once the image loads.
 */
export function qrImageUrl(payload: string, size = 320): string {
	const encoded = encodeURIComponent(payload)
	return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
}
