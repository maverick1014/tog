/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tog/shared'],
};

export default nextConfig;

// Enables Cloudflare bindings (env, etc.) during `next dev` via OpenNext.
// No-op in production builds.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
