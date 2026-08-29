import test from "node:test";
import assert from "node:assert/strict";
import { getClientRateLimitKey } from "./rateLimit.middleware";

test("uses forwarded IP before socket IP for rate-limit bucketing", () => {
  const req = {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.5",
    },
    socket: { remoteAddress: "10.0.0.5" },
    ip: "10.0.0.5",
  } as any;

  assert.equal(getClientRateLimitKey(req), "203.0.113.10");
});

test("falls back to socket remote address when no forwarded headers exist", () => {
  const req = {
    headers: {},
    socket: { remoteAddress: "198.51.100.22" },
    ip: "198.51.100.22",
  } as any;

  assert.equal(getClientRateLimitKey(req), "198.51.100.22");
});
