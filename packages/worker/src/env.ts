export interface Env {
  KV: KVNamespace;

  // Secrets — set via `wrangler secret put` or `.dev.vars`
  NSW_API_KEY: string;
  NSW_API_AUTH: string; // Basic auth header for OAuth token request
  QLD_API_TOKEN: string;
}
