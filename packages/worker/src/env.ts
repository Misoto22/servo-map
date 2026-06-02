export interface Env {
  KV: KVNamespace;

  // Secrets — set via `wrangler secret put` or `.dev.vars`
  NSW_API_KEY: string;
  NSW_API_AUTH: string; // Basic auth header for OAuth token request
  QLD_API_TOKEN: string;

  // Fine-grained GitHub PAT (Actions: read+write) used by the scheduled handler
  // to dispatch the ingest workflow. Optional — only the cron path needs it.
  GH_DISPATCH_TOKEN?: string;
}
