# @mockcard/nextjs

MockCard for Next.js App Router apps: guard your webhook route against MockCard's production probes,
and run chaos scenarios against the route handler in your tests — no server needed.

Author: Arixeva Labs <hello@arixevalabs.com> · [mockcard.io](https://www.mockcard.io) · MIT

```sh
npm install @mockcard/nextjs
```

## Probe guard

```ts
// app/api/webhooks/stripe/route.ts
import { withProbeGuard } from "@mockcard/nextjs";

export const POST = withProbeGuard(async (req) => {
  // your normal Stripe handling — MockCard production probes never reach this code
});
```

Set `MOCKCARD_PROBE_SECRET` to the project's probe secret (dashboard → Projects).

## Chaos run in a test (Vitest or Jest)

```ts
import { expect, test } from "vitest";
import { MockCard, runChaos, inProcess, mockcardMatchers } from "@mockcard/nextjs";
import { POST } from "@/app/api/webhooks/stripe/route";

expect.extend(mockcardMatchers);

test("webhook route survives payment chaos", async () => {
  const run = await runChaos(new MockCard(), {
    projectId: "prj_…",
    target: "http://in-process/api/webhooks/stripe",
    fetch: inProcess(POST),
    assertions: { duplicate: { "fulfilled once": async () => (await countFulfilledOrders()) === 1 } },
  });
  expect(run).toPassChaos();
}, 60_000);
```

Everything from [`mockcard`](https://www.npmjs.com/package/mockcard) is re-exported.
