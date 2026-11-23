/**
 * Test configuration for the Next.js SDK (keeps it independent of any parent project's config).
 *
 * Author: Arixeva Labs <hello@arixevalabs.com>
 */
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["test/**/*.test.ts"], environment: "node" } });
