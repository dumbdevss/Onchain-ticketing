import {
	type ISupportedWallet,
	StellarWalletsKit,
	type WalletNetwork,
	allowAllModules,
} from "@creit.tech/stellar-wallets-kit"
import { Horizon } from "@stellar/stellar-sdk"
import { networkPassphrase, stellarNetwork } from "../contracts/util"
import storage from "./storage"

// `StellarWalletsKit` (and the modules returned by `allowAllModules()`) touch
// `window` during construction, which throws under Next.js SSR / static build.
// Lazily instantiate on first browser use, and use a no-op proxy on the server.
type LazyKit = StellarWalletsKit
let _kit: LazyKit | null = null
function getKit(): LazyKit {
	if (typeof window === "undefined") {
		// Return a stub on the server. Anything that actually invokes wallet
		// methods runs inside `'use client'` boundaries, so this is only ever
		// touched by static-prerender code paths that never call into it.
		return new Proxy({} as LazyKit, {
			get() {
				throw new Error(
					"Wallet kit accessed on the server. This should only run in the browser.",
				)
			},
		})
	}
	if (!_kit) {
		_kit = new StellarWalletsKit({
			network: networkPassphrase as WalletNetwork,
			modules: allowAllModules(),
		})
	}
	return _kit
}

export const connectWallet = async () => {
	const kit = getKit()
	await kit.openModal({
		modalTitle: "Connect to your wallet",
		onWalletSelected: (option: ISupportedWallet) => {
			const selectedId = option.id
			kit.setWallet(selectedId)

			// Now open selected wallet's login flow by calling `getAddress` --
			// Yes, it's strange that a getter has a side effect of opening a modal
			void kit.getAddress().then((address) => {
				// Once `getAddress` returns successfully, we know they actually
				// connected the selected wallet, and we set our localStorage
				if (address.address) {
					storage.setItem("walletId", selectedId)
					storage.setItem("walletAddress", address.address)
				} else {
					storage.setItem("walletId", "")
					storage.setItem("walletAddress", "")
				}
			})
			if (selectedId == "freighter" || selectedId == "hot-wallet") {
				void kit.getNetwork().then((network) => {
					if (network.network && network.networkPassphrase) {
						storage.setItem("walletNetwork", network.network)
						storage.setItem("networkPassphrase", network.networkPassphrase)
					} else {
						storage.setItem("walletNetwork", "")
						storage.setItem("networkPassphrase", "")
					}
				})
			}
		},
	})
}

export const disconnectWallet = async () => {
	await getKit().disconnect()
	storage.removeItem("walletId")
	storage.removeItem("walletAddress")
	storage.removeItem("walletNetwork")
	storage.removeItem("networkPassphrase")
}

function getHorizonHost(mode: string) {
	switch (mode) {
		case "LOCAL":
			return "http://localhost:8000"
		case "FUTURENET":
			return "https://horizon-futurenet.stellar.org"
		case "TESTNET":
			return "https://horizon-testnet.stellar.org"
		case "PUBLIC":
			return "https://horizon.stellar.org"
		default:
			throw new Error(`Unknown Stellar network: ${mode}`)
	}
}

let _horizon: Horizon.Server | null = null
function getHorizon(): Horizon.Server {
	if (!_horizon) {
		_horizon = new Horizon.Server(getHorizonHost(stellarNetwork), {
			allowHttp: stellarNetwork === "LOCAL",
		})
	}
	return _horizon
}

const formatter = new Intl.NumberFormat()

export type MappedBalances = Record<string, Horizon.HorizonApi.BalanceLine>

export const fetchBalances = async (address: string) => {
	try {
		const { balances } = await getHorizon().accounts().accountId(address).call()
		const mapped = balances.reduce((acc, b) => {
			b.balance = formatter.format(Number(b.balance))
			const key =
				b.asset_type === "native"
					? "xlm"
					: b.asset_type === "liquidity_pool_shares"
						? b.liquidity_pool_id
						: `${b.asset_code}:${b.asset_issuer}`
			acc[key] = b
			return acc
		}, {} as MappedBalances)
		return mapped
	} catch (err) {
		// `not found` is sort of expected, indicating an unfunded wallet, which
		// the consumer of `balances` can understand via the lack of `xlm` key.
		// If the error does NOT match 'not found', log the error.
		// We should also possibly not return `{}` in this case?
		if (!(err instanceof Error && err.message.match(/not found/i))) {
			console.error(err)
		}
		return {}
	}
}

export const wallet = new Proxy({} as StellarWalletsKit, {
	get(_target, prop) {
		const kit = getKit() as unknown as Record<string | symbol, unknown>
		const value = kit[prop]
		return typeof value === "function" ? value.bind(kit) : value
	},
}) as StellarWalletsKit
