import { NextResponse } from "next/server";

import { enforceRateLimit, enforceTrustedOrigin } from "@/fxsave/api-security";
import { FXSAVE_CONFIG, getBaseTokenOptionByAddress, isAddress } from "@/fxsave/config";

type RequestBody = {
  amount?: string;
  fromAddress?: string;
  tokenAddress?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const originError = enforceTrustedOrigin(request);

  if (originError) {
    return originError;
  }

  const rateLimitError = enforceRateLimit(request, {
    limit: 40,
    routeKey: "fxsave-approve",
    windowMs: 60_000,
  });

  if (rateLimitError) {
    return rateLimitError;
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const amount = body.amount?.trim();
  const fromAddress = body.fromAddress?.trim();
  const tokenAddress = body.tokenAddress?.trim();

  if (!amount || amount === "0") {
    return badRequest("Approval amount must be greater than zero.");
  }

  if (!fromAddress || !isAddress(fromAddress)) {
    return badRequest("A valid wallet address is required.");
  }

  if (!tokenAddress || !isAddress(tokenAddress)) {
    return badRequest("A valid token address is required.");
  }

  const customTokensEnabled =
    process.env.NODE_ENV !== "production" || process.env.FXSAVE_ENABLE_CUSTOM_TOKENS === "true";
  const presetToken = getBaseTokenOptionByAddress(tokenAddress);

  if (!customTokensEnabled && !presetToken && tokenAddress.toLowerCase() !== FXSAVE_CONFIG.base.fxSave.address.toLowerCase()) {
    return badRequest("Custom tokens are disabled in production.");
  }

  const apiKey = process.env.ENSO_API_KEY?.trim();
  const referralCode = process.env.ENSO_REFERRAL_CODE?.trim();
  const includeDiagnostics = process.env.NODE_ENV !== "production";
  const query = new URLSearchParams({
    amount,
    chainId: String(FXSAVE_CONFIG.sourceChainId),
    fromAddress,
    routingStrategy: FXSAVE_CONFIG.routingStrategy,
    tokenAddress,
  });

  if (referralCode) {
    query.set("referralCode", referralCode);
  }

  const url = `https://api.enso.finance/api/v1/wallet/approve?${query.toString()}`;
  const headers: HeadersInit = {
    accept: "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const upstream = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeout);
    });
    const rawText = await upstream.text();
    let parsed: unknown = rawText;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Enso approval transaction failed.",
          status: upstream.status,
          ...(includeDiagnostics
            ? {
                details: parsed,
                request: {
                  url,
                },
              }
            : {}),
        },
        { status: upstream.status },
      );
    }

    return NextResponse.json({
      result: parsed,
      ...(includeDiagnostics
        ? {
            request: {
              url,
            },
          }
        : {}),
    });
  } catch (error) {
    const details =
      error instanceof Error && error.name === "AbortError"
        ? "Upstream Enso approval request timed out."
        : error instanceof Error
          ? error.message
          : "Unknown upstream error.";

    return NextResponse.json(
      {
        error: "Failed to reach Enso approval endpoint.",
        details,
      },
      { status: 502 },
    );
  }
}
