import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Pin the workspace root to this app so Next doesn't pick a parent lockfile.
  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
};

export default withMDX(config);
