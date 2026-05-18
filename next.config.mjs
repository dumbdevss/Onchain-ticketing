/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,

	// `@stellar/stellar-xdr-json`, `@stellar/design-system`, and
	// `@theahaco/contract-explorer` ship ESM that references package internals.
	// Transpile them through Next's webpack pipeline so directory imports
	// (e.g. `from "./components"`) are resolved correctly.
	transpilePackages: [
		"@creit.tech/stellar-wallets-kit",
		"@stellar/design-system",
		"@stellar/freighter-api",
		"@stellar/stellar-xdr-json",
		"@theahaco/contract-explorer",
	],

	// Loose ESM resolution allows transitive packages to use Node-style
	// directory imports (which `@stellar/design-system` relies on) without
	// crashing the strict ESM loader during page-data collection.
	experimental: {
		esmExternals: "loose",
	},

	// Vite previously rewrote /friendbot to the local stellar quickstart container.
	// Mirror that with Next's rewrites so the dev experience is identical.
	async rewrites() {
		return [
			{
				source: "/friendbot/:path*",
				destination: "http://localhost:8000/friendbot/:path*",
			},
		]
	},

	webpack(config, { isServer, webpack }) {
		// Async WebAssembly support (replaces vite-plugin-wasm).
		config.experiments = {
			...(config.experiments ?? {}),
			asyncWebAssembly: true,
			layers: true,
		}

		// `@stellar/design-system` ships a rollup-bundled ESM entry at
		// `build/index.esm.js` that inlines its component sources. Use that
		// directly — its `package.json#main` (`build/index.js`) does Node-style
		// directory imports plus per-component asset references that Next.js's
		// server runtime cannot resolve.
		config.resolve.alias = {
			...(config.resolve.alias ?? {}),
			"@stellar/design-system$": "@stellar/design-system/build/index.esm.js",
		}

		// Each design-system component contains a side-effect-only
		// `import "./styles.scss"` left over from its source build, but the
		// SCSS files are not shipped in `node_modules`. The styles are already
		// available as the precompiled `styles.min.css` we import from the root
		// layout, so safely ignore every `.scss` resource at bundle time.
		config.plugins = config.plugins ?? []
		config.plugins.push(
			new webpack.IgnorePlugin({
				// `@stellar/design-system` ships prebuilt JS that still references
				// dev-time `.scss` and asset files (`./arrow.svg`, etc.) which were
				// never copied into the published `node_modules` directory. The real
				// styles are already covered by `styles.min.css` from the layout, so
				// drop any unresolved `.scss`/asset import that originates in the
				// design-system package.
				checkResource(resource, context) {
					if (!/\.(scss|svg|png|jpe?g|gif|woff2?)$/.test(resource)) {
						return false
					}
					return /@stellar[\\/]design-system/.test(context)
				},
			}),
		)

		// stellar-sdk and friends are designed for browsers + assume `Buffer` is
		// global. Replace any node-only sources with browser-safe shims when
		// bundling for the client.
		if (!isServer) {
			config.resolve.fallback = {
				...(config.resolve.fallback ?? {}),
				fs: false,
				net: false,
				tls: false,
				crypto: false,
			}
		}

		return config
	},
}

export default nextConfig
