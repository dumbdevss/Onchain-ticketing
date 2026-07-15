import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col justify-center items-center text-center flex-1 gap-6 px-4">
      <h1 className="text-3xl sm:text-4xl font-bold">🌟 Stellar MCP Server</h1>
      <p className="max-w-2xl text-fd-muted-foreground">
        A Model Context Protocol server that lets AI assistants interact with
        the Stellar blockchain — manage accounts, process payments, create
        assets, and build, deploy, and inspect Soroban smart contracts.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/docs"
          className="rounded-lg bg-fd-primary text-fd-primary-foreground px-5 py-2.5 font-medium"
        >
          Read the docs
        </Link>
        <Link
          href="/docs/installation"
          className="rounded-lg border px-5 py-2.5 font-medium"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}
