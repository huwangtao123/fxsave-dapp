/** @vitest-environment node */

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/fxsave/approve-route";

function buildRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://fxsave.test/api/fxsave/fxsave-approve", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      host: "fxsave.test",
      ...headers,
    },
    method: "POST",
  });
}

describe("fxsave approve route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    delete (globalThis as typeof globalThis & { __fxsaveRateLimitStore?: unknown }).__fxsaveRateLimitStore;
  });

  it("rejects requests from untrusted origins in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(
      buildRequest(
        {
          amount: "1000",
          fromAddress: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
          tokenAddress: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
        },
        { origin: "https://evil.test" },
      ),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Origin not allowed.",
    });
  });

  it("rejects custom token approvals in production by default", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(
      buildRequest(
        {
          amount: "1000",
          fromAddress: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
          tokenAddress: "0x1111111111111111111111111111111111111111",
        },
        { origin: "https://fxsave.test" },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Custom tokens are disabled in production.",
    });
  });

  it("returns approval payloads for preset tokens", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            amount: "1000",
            spender: "0xf75584ef6673ad213a685a1b58cc0330b8ea22cf",
            tx: {
              to: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
              data: "0xabc",
              value: "0",
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await POST(
      buildRequest(
        {
          amount: "1000",
          fromAddress: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
          tokenAddress: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
        },
        { origin: "https://fxsave.test" },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      result: {
        amount: "1000",
        spender: "0xf75584ef6673ad213a685a1b58cc0330b8ea22cf",
        tx: {
          to: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
          data: "0xabc",
          value: "0",
        },
      },
    });
  });
});
