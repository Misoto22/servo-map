import type { Env } from "../env";

// Cloudflare Cron Trigger 调度可靠，但州 API 对 GitHub runner 的出口 IP 更友好
// （NSW 曾对 Cloudflare 共享出口 IP 限流，故 ingest 执行仍放在 GH Actions）。
// 这里只用 CF cron 去“触发” GH 的 ingest workflow，把可靠调度和执行解耦。
const GH_OWNER = "Misoto22";
const GH_REPO = "servo-map";
const WORKFLOW_FILE = "fetch-data.yml";

/** 通过 GitHub API 触发 ingest workflow（workflow_dispatch）。成功返回 204。 */
export async function dispatchIngest(env: Env): Promise<void> {
  if (!env.GH_DISPATCH_TOKEN) {
    throw new Error("GH_DISPATCH_TOKEN not set — cannot dispatch ingest workflow");
  }
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "servo-map-cron",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (res.status !== 204) {
    const body = await res.text().catch(() => "");
    throw new Error(`GH workflow dispatch failed: ${res.status} — ${body}`);
  }
}
