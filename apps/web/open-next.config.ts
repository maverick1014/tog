import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Default OpenNext-on-Cloudflare config. Add caching (KV/R2/D1) overrides here
// later if needed; the app currently reads all data live from Supabase.
export default defineCloudflareConfig({});
