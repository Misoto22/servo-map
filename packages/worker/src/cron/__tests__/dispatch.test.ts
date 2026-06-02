import { describe, it, expect, vi, afterEach } from "vitest";
import { dispatchIngest } from "../dispatch";
import type { Env } from "../../env";

const env = { GH_DISPATCH_TOKEN: "ghp_test" } as unknown as Env;

afterEach(() => vi.unstubAllGlobals());

describe("dispatchIngest", () => {
  it("POSTs a workflow_dispatch to GitHub with auth and ref=main", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await dispatchIngest(env);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(
      "/repos/Misoto22/servo-map/actions/workflows/fetch-data.yml/dispatches",
    );
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ghp_test");
    expect(headers["User-Agent"]).toBeTruthy();
    expect(JSON.parse(init.body as string)).toEqual({ ref: "main" });
  });

  it("throws when GH_DISPATCH_TOKEN is missing", async () => {
    await expect(dispatchIngest({} as Env)).rejects.toThrow(/GH_DISPATCH_TOKEN/);
  });

  it("throws on a non-204 GitHub response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad", { status: 401 })));
    await expect(dispatchIngest(env)).rejects.toThrow(/dispatch failed: 401/);
  });
});
