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
