/** @vitest-environment node */

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/fxsave/bundle-route";

function buildRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://fxsave.test/api/fxsave/fxsave-bundle", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      host: "fxsave.test",
      ...headers,
    },
    method: "POST",
  });
}

describe("fxsave bundle route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    delete (globalThis as typeof globalThis & { __fxsaveRateLimitStore?: unknown }).__fxsaveRateLimitStore;
  });

  it("rejects invalid amounts", async () => {
    const response = await POST(
      buildRequest({
        amount: "0",
        direction: "mint",
        fromAddress: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
        receiver: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
        sourceTokenAddress: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
        sourceTokenSymbol: "fxUSD",
        sourceTokenDecimals: 18,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Amount must be greater than zero.",
    });
  });

  it("rejects custom mint sources in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(
      buildRequest(
        {
          amount: "1",
          direction: "mint",
          fromAddress: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
          receiver: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
          sourceTokenAddress: "0x1111111111111111111111111111111111111111",
          sourceTokenSymbol: "TEST",
          sourceTokenDecimals: 18,
        },
        { origin: "https://fxsave.test" },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Custom source tokens are disabled in production.",
    });
  });

  it("builds a mint bundle for preset tokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            minAmountsOut: {
              "0x085780639cc2cacd35e474e71f4d000e2405d8f6": "990000000000000000",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            minAmountsOut: {
              "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39": "970000000000000000",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tx: {
              to: "0xf75584ef6673ad213a685a1b58cc0330b8ea22cf",
              data: "0xabc",
              value: "0",
            },
            minAmountsOut: {
              "0x273f20fa9fbe803e5d6959add9582dac240ec3be": "970000000000000000",
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      buildRequest({
        amount: "1",
        direction: "mint",
        fromAddress: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
        receiver: "0x241e25c9d15b5E7FB007B5E028C4ce8694893870",
        sourceTokenAddress: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
        sourceTokenSymbol: "fxUSD",
        sourceTokenDecimals: 18,
      }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toMatchObject({
      flow: [
        "Bridge Base fxUSD to Ethereum mainnet",
        "Deposit mainnet fxUSD into fxSAVE",
        "Bridge minted fxSAVE back to Base",
      ],
      quotePlan: {
        sourceToken: "fxUSD",
        targetToken: "fxSAVE",
      },
      result: {
        tx: {
          to: "0xf75584ef6673ad213a685a1b58cc0330b8ea22cf",
        },
      },
    });
  });
});
