/** Format helpers for stellar-ticket UI. */

const STROOPS_PER_XLM = 10_000_000n

export function xlmToStroops(xlm: string | number): bigint {
	// Accept up to 7 decimal places without floating-point loss.
	const [whole = "0", fracRaw = ""] = String(xlm).split(".")
	const frac = (fracRaw + "0000000").slice(0, 7)
	const sign = whole.startsWith("-") ? -1n : 1n
	const absWhole = whole.replace("-", "")
	return sign * (BigInt(absWhole) * STROOPS_PER_XLM + BigInt(frac))
}

export function stroopsToXlm(stroops: bigint): string {
	const negative = stroops < 0n
	const abs = negative ? -stroops : stroops
	const whole = abs / STROOPS_PER_XLM
	const frac = (abs % STROOPS_PER_XLM)
		.toString()
		.padStart(7, "0")
		.replace(/0+$/, "")
	const out = frac ? `${whole}.${frac}` : `${whole}`
	return negative ? `-${out}` : out
}

export function formatDate(unixSeconds: bigint | number): string {
	const ms = Number(unixSeconds) * 1000
	if (!Number.isFinite(ms) || ms <= 0) return "—"
	return new Date(ms).toLocaleString()
}

export function shortAddr(addr: string, chars = 6): string {
	if (!addr || addr.length <= chars * 2 + 1) return addr
	return `${addr.slice(0, chars)}…${addr.slice(-chars)}`
}

const ID_ALPHABET =
	"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

export function makeId(prefix: string, len = 12): string {
	const bytes = new Uint8Array(len)
	crypto.getRandomValues(bytes)
	let out = ""
	for (let i = 0; i < len; i++) {
		out += ID_ALPHABET[bytes[i]! % ID_ALPHABET.length]
	}
	return `${prefix}_${out}`
}
