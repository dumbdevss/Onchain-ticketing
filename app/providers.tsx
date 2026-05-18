"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { NotificationProvider } from "../src/providers/NotificationProvider"
import { WalletProvider } from "../src/providers/WalletProvider"

export function Providers({ children }: { children: ReactNode }) {
	// Lazily create the QueryClient inside a `useState` initialiser so a single
	// instance is reused across renders but a fresh one is built per browser
	// session (avoids cross-request leaks during SSR).
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
						retry: false,
					},
				},
			}),
	)

	return (
		<NotificationProvider>
			<QueryClientProvider client={queryClient}>
				<WalletProvider>{children}</WalletProvider>
			</QueryClientProvider>
		</NotificationProvider>
	)
}
