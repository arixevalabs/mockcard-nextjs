/**
 * Tests for the Next.js glue, using the shared conformance fixtures.
 *
 * Author: Arixeva Labs <hello@arixevalabs.com>
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { deliverAll, inProcess, mockcardMatchers, withProbeGuard } from "../src/index.js";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../conformance/${name}`, import.meta.url), "utf8"));

describe("withProbeGuard", () => {
  const { secret, cases } = fixture("probe-signatures.json");
  const valid = cases.find((c: { name: string }) => c.name === "valid");

  it("acknowledges a verified probe without calling the handler", async () => {
    vi.useFakeTimers({ now: fixture("probe-signatures.json").now * 1000 });
    const handler = vi.fn(async () => new Response("processed"));
    const res = await withProbeGuard(handler, { probeSecret: secret })(new Request("http://x/hook", { method: "POST", headers: valid.headers, body: valid.body }));
    vi.useRealTimers();
    expect(res.headers.get("MockCard-Probe-Ack")).toBe("skipped");
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes forged probes and normal events to the handler", async () => {
    const handler = vi.fn(async () => new Response("processed"));
    const guarded = withProbeGuard(handler, { probeSecret: secret });
    await guarded(new Request("http://x/hook", { method: "POST", headers: { "MockCard-Probe": "1", "MockCard-Signature": "t=1,v1=" + "0".repeat(64) }, body: "{}" }));
    await guarded(new Request("http://x/hook", { method: "POST", body: "{}" }));
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe("inProcess", () => {
  it("delivers chaos events straight to the route handler", async () => {
    const seen: string[] = [];
    const handler = async (req: Request) => (seen.push(req.headers.get("X-MockCard-Signature") ?? ""), new Response(null, { status: 204 }));
    const results = await deliverAll(fixture("pull-run.json").deliveries, "http://in-process/hook", { fetch: inProcess(handler), sleep: async () => undefined });
    expect(results.map((r) => r.status_code)).toEqual([204, 204, 204]);
    expect(seen).toEqual(["sha256=test", "sha256=test", "sha256=test"]);
  });
});

describe("toPassChaos", () => {
  it("fails with the failed checks listed", () => {
    const result = mockcardMatchers.toPassChaos({ id: "run_1", project_id: "p", mode: "pull", status: "failed", scenarios: [], score: 50, results: { checks: [{ scenario: "duplicate", name: "fulfilled once", passed: false, detail: "twice" }] } });
    expect(result.pass).toBe(false);
    expect(result.message()).toContain("duplicate · fulfilled once: twice");
  });
});
