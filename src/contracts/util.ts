import { WalletNetwork } from "@creit.tech/stellar-wallets-kit"
import { type Network, type NetworkType } from "@theahaco/contract-explorer"
import { z } from "zod"

const envSchema = z.object({
	NEXT_PUBLIC_STELLAR_NETWORK: z.enum([
		"PUBLIC",
		"FUTURENET",
		"TESTNET",
		"LOCAL",
		"STANDALONE", // deprecated in favor of LOCAL
	] as const),
	NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: z.nativeEnum(WalletNetwork),
	NEXT_PUBLIC_STELLAR_RPC_URL: z.string(),
	NEXT_PUBLIC_STELLAR_HORIZON_URL: z.string(),
})

// NEXT_PUBLIC_* env vars are statically inlined by the Next.js build at
// compile time so this works in both server and client contexts.
const parsed = envSchema.safeParse({
	NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
	NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE:
		process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE,
	NEXT_PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
	NEXT_PUBLIC_STELLAR_HORIZON_URL: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
})

const env: z.infer<typeof envSchema> = parsed.success
	? parsed.data
	: {
			NEXT_PUBLIC_STELLAR_NETWORK: "LOCAL",
			NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE: WalletNetwork.STANDALONE,
			NEXT_PUBLIC_STELLAR_RPC_URL: "http://localhost:8000/rpc",
			NEXT_PUBLIC_STELLAR_HORIZON_URL: "http://localhost:8000",
		}

export const stellarNetwork =
	env.NEXT_PUBLIC_STELLAR_NETWORK === "STANDALONE"
		? "LOCAL"
		: env.NEXT_PUBLIC_STELLAR_NETWORK
export const networkPassphrase = env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE

const stellarEncode = (str: string) => {
	return str.replace(/\//g, "//").replace(/;/g, "/;")
}

export const labPrefix = () => {
	switch (stellarNetwork) {
		case "LOCAL":
			return `http://localhost:8000/lab/transaction-dashboard?$=network$id=custom&label=Custom&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(rpcUrl)}&passphrase=${stellarEncode(networkPassphrase)};`
		case "PUBLIC":
			return `https://lab.stellar.org/transaction-dashboard?$=network$id=mainnet&label=Mainnet&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(rpcUrl)}&passphrase=${stellarEncode(networkPassphrase)};`
		case "TESTNET":
			return `https://lab.stellar.org/transaction-dashboard?$=network$id=testnet&label=Testnet&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(rpcUrl)}&passphrase=${stellarEncode(networkPassphrase)};`
		case "FUTURENET":
			return `https://lab.stellar.org/transaction-dashboard?$=network$id=futurenet&label=Futurenet&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(rpcUrl)}&passphrase=${stellarEncode(networkPassphrase)};`
		default:
			return `https://lab.stellar.org/transaction-dashboard?$=network$id=testnet&label=Testnet&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(rpcUrl)}&passphrase=${stellarEncode(networkPassphrase)};`
	}
}

// NOTE: needs to be exported for contract files in this directory
export const rpcUrl = env.NEXT_PUBLIC_STELLAR_RPC_URL
export const horizonUrl = env.NEXT_PUBLIC_STELLAR_HORIZON_URL

const networkToId = (network: string): NetworkType => {
	switch (network) {
		case "PUBLIC":
			return "mainnet"
		case "TESTNET":
			return "testnet"
		case "FUTURENET":
			return "futurenet"
		default:
			return "local"
	}
}

export const network: Network = {
	id: networkToId(stellarNetwork),
	label: stellarNetwork.toLowerCase(),
	passphrase: networkPassphrase,
	rpcUrl: rpcUrl,
	horizonUrl: horizonUrl,
}
