/**
 * MockCard for Next.js (App Router). Framework glue only; everything else comes from `mockcard`:
 *  - `withProbeGuard` wraps a webhook route handler so verified MockCard production probes are
 *    acknowledged and skipped before your code runs.
 *  - `inProcess` turns a route handler into the delivery target of a chaos run, so tests need no server.
 *  - `mockcardMatchers` adds `expect(run).toPassChaos()` to Vitest or Jest.
 *
 * Author: Arixeva Labs <hello@arixevalabs.com>
 */
import { isProbe, probeAckResponse, verifyProbe, type Run } from "mockcard";

export * from "mockcard";

type RouteHandler = (req: Request, ctx?: unknown) => Response | Promise<Response>;

/**
 * Wraps a webhook route handler with the production probe guard.
 *
 * @param handler - Your POST handler.
 * @param options.probeSecret - Your project's probe secret; defaults to MOCKCARD_PROBE_SECRET.
 * @returns A handler that answers verified probes with 200 + MockCard-Probe-Ack and passes every
 *   other request (including forged probes) to your handler unchanged.
 */
export function withProbeGuard(handler: RouteHandler, { probeSecret = process.env.MOCKCARD_PROBE_SECRET ?? "" }: { probeSecret?: string } = {}): RouteHandler {
  return async (req, ctx) => {
    if (!isProbe(req.headers)) return handler(req, ctx);
    const body = await req.clone().text();
    return verifyProbe(req.headers, body, probeSecret) ? probeAckResponse() : handler(req, ctx);
  };
}

/**
 * A fetch implementation that delivers chaos-run events straight to a route handler, in-process.
 * Pass it as `fetch` to `runChaos` (with any `target` URL).
 *
 * @param handler - Your POST route handler.
 * @returns A fetch-compatible function.
 */
export function inProcess(handler: RouteHandler): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const { signal: _signal, ...rest } = init ?? {};
    return handler(new Request(input, rest));
  }) as typeof fetch;
}

/** Vitest/Jest matchers: `expect.extend(mockcardMatchers)`. */
export const mockcardMatchers = {
  /**
   * Passes when a chaos run passed.
   *
   * @param run - The scored run.
   * @returns The matcher result, listing failed checks when it fails.
   */
  toPassChaos(run: Run) {
    const failed = (run.results?.checks ?? []).filter((c) => !c.passed).map((c) => `  ✗ ${c.scenario} · ${c.name}: ${c.detail}`);
    return {
      pass: run.status === "passed",
      message: () => `Expected MockCard run ${run.id} to pass, but it ${run.status} (score ${run.score ?? "n/a"}/100)\n${failed.join("\n")}`,
    };
  },
};
