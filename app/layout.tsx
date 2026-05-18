import { type Metadata } from "next"
import { type ReactNode } from "react"
import { AppShell } from "./AppShell"
import { Providers } from "./providers"
import "@stellar/design-system/build/styles.min.css"
import "./globals.css"

export const metadata: Metadata = {
	title: "StellarTicket",
	description:
		"On-chain event ticketing on Stellar — mint, sell, and verify tickets via Soroban smart contracts.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin=""
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Inconsolata:wght@500&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body>
				<Providers>
					<AppShell>{children}</AppShell>
				</Providers>
			</body>
		</html>
	)
}
