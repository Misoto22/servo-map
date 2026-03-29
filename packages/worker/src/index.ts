import { Hono } from "hono";
import { cors } from "hono/cors";
import { stationsRoute } from "./routes/stations";
import { metadataRoute } from "./routes/metadata";
import { brandsRoute } from "./routes/brands";
import { handleScheduled } from "./cron/handler";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Health check
app.get("/", (c) => c.json({ name: "servo-map-api", version: "1.0.0" }));

// 手动触发 cron（调试用）
app.get("/api/v1/cron", async (c) => {
  const logs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  const origWarn = console.warn;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  console.error = (...args: unknown[]) => logs.push("[ERROR] " + args.map(String).join(" "));
  console.warn = (...args: unknown[]) => logs.push("[WARN] " + args.map(String).join(" "));
  try {
    await handleScheduled(c.env);
    return c.json({ status: "success", logs });
  } catch (e) {
    return c.json({ status: "error", message: String(e), logs }, 500);
  } finally {
    console.log = origLog;
    console.error = origErr;
    console.warn = origWarn;
  }
});

// API routes
const api = app.basePath("/api/v1");
api.route("/stations", stationsRoute);
api.route("/metadata", metadataRoute);
api.route("/brands", brandsRoute);

export default {
  fetch: app.fetch,

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};
