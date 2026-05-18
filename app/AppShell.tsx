"use client"

import { Button, Icon, Layout } from "@stellar/design-system"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"
import ConnectAccount from "../src/components/ConnectAccount"
import { labPrefix } from "../src/contracts/util"
import styles from "./AppShell.module.css"

interface NavButtonProps {
	href: string
	icon: ReactNode
	label: string
}

function NavButton({ href, icon, label }: NavButtonProps) {
	const pathname = usePathname()
	const active = pathname === href || pathname?.startsWith(`${href}/`)
	return (
		<Link href={href}>
			<Button variant="tertiary" size="md" disabled={active}>
				{icon}
				{label}
			</Button>
		</Link>
	)
}

export function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className={styles.AppLayout}>
			<Layout.Header
				projectId="StellarTicket"
				projectTitle="StellarTicket"
				hasThemeSwitch={true}
				contentCenter={
					<>
						<NavButton
							href="/events/create"
							icon={<Icon.Calendar size="md" />}
							label="Create event"
						/>
						<NavButton
							href="/scan"
							icon={<Icon.Scan size="md" />}
							label="Scan"
						/>
						<NavButton
							href="/dashboard"
							icon={<Icon.BarChartSquareUp size="md" />}
							label="Dashboard"
						/>
						<a href={labPrefix()} target="_blank" rel="noreferrer">
							<Button variant="tertiary" size="md">
								<Icon.SearchMd size="md" />
								Tx Explorer
							</Button>
						</a>
					</>
				}
				contentRight={<ConnectAccount />}
			/>

			<main>
				<Layout.Content>
					<Layout.Inset>{children}</Layout.Inset>
				</Layout.Content>
			</main>

			<Layout.Footer>
				<nav>
					<a
						href="https://github.com/dumbdevss/Onchain-ticketing"
						className="Link Link--secondary"
						target="_blank"
						rel="noreferrer"
					>
						<Icon.GitPullRequest size="sm" /> GitHub
					</a>
					<a
						href="https://scaffoldstellar.org"
						className="Link Link--secondary"
						target="_blank"
						rel="noreferrer"
					>
						<Icon.BookOpen01 size="sm" /> Stellar Scaffold
					</a>
				</nav>
			</Layout.Footer>
		</div>
	)
}
