import { NextResponse } from "next/server";

import { enforceRateLimit, enforceTrustedOrigin } from "@/fxsave/api-security";
import {
  BundleAction,
  FXSAVE_CONFIG,
  FxsaveDirection,
  getBaseTokenOptionByAddress,
  getFlowSteps,
  isAddress,
  parseUnits,
} from "@/fxsave/fxsave";

type RequestBody = {
  amount?: string;
  direction?: FxsaveDirection;
  fromAddress?: string;
  receiver?: string;
  sourceTokenAddress?: string;
  sourceTokenSymbol?: string;
  sourceTokenDecimals?: number;
  targetTokenAddress?: string;
  targetTokenSymbol?: string;
  targetTokenDecimals?: number;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function getSingleAmount(
  payload: unknown,
  tokenAddress: string,
  key: "amountsOut" | "minAmountsOut",
) {
  if (!payload || typeof payload !== "object") {
    throw new Error(`Missing ${key} in Enso response.`);
  }

  const bucket = (payload as Record<string, unknown>)[key];
  if (!bucket || typeof bucket !== "object") {
    throw new Error(`Missing ${key} in Enso response.`);
  }

  const value = (bucket as Record<string, unknown>)[tokenAddress.toLowerCase()];
  if (typeof value !== "string") {
    throw new Error(`Missing ${key} for token ${tokenAddress}.`);
  }

  return value;
}

function buildMintBridgeQuoteActions(args: {
  amountIn: string;
  receiver: string;
  sourceTokenAddress: string;
  usesDirectFxUsd: boolean;
}): BundleAction[] {
  const actions: BundleAction[] = [];

  if (!args.usesDirectFxUsd) {
    actions.push({
      protocol: "enso",
      action: "route",
      args: {
        tokenIn: args.sourceTokenAddress,
        tokenOut: FXSAVE_CONFIG.base.fxUsd.address,
        amountIn: args.amountIn,
        receiver: args.receiver,
      },
    });
  }

  actions.push({
    protocol: "stargate",
    action: "bridge",
    args: {
      primaryAddress: FXSAVE_CONFIG.base.fxUsd.bridgePool,
      destinationChainId: FXSAVE_CONFIG.destinationChainId,
      tokenIn: FXSAVE_CONFIG.base.fxUsd.address,
      amountIn: args.usesDirectFxUsd ? args.amountIn : { useOutputOfCallAt: 0 },
      receiver: args.receiver,
    },
  });

  return actions;
}

function buildMintDepositQuoteActions(args: {
  bridgedFxUsdAmount: string;
  receiver: string;
}): BundleAction[] {
  return [
    {
      protocol: "stargate",
      action: "bridge",
      args: {
        primaryAddress: FXSAVE_CONFIG.base.fxUsd.bridgePool,
        destinationChainId: FXSAVE_CONFIG.destinationChainId,
        tokenIn: FXSAVE_CONFIG.base.fxUsd.address,
        amountIn: args.bridgedFxUsdAmount,
        receiver: args.receiver,
        callback: [
          {
            protocol: "enso",
            action: "balance",
            args: {
              token: FXSAVE_CONFIG.mainnet.fxUsd.address,
            },
          },
          {
            protocol: "fx-save",
            action: "deposit",
            args: {
              primaryAddress: FXSAVE_CONFIG.mainnet.fxSave.primaryAddress,
              tokenIn: FXSAVE_CONFIG.mainnet.fxUsd.address,
              tokenOut: FXSAVE_CONFIG.mainnet.fxSave.address,
              amountIn: args.bridgedFxUsdAmount,
              receiver: args.receiver,
            },
          },
        ],
      },
    },
  ];
}

function buildMintExecutableActions(args: {
  bridgedFxUsdAmount: string;
  fxSaveAmount: string;
  receiver: string;
  sourceAmountIn: string;
  sourceTokenAddress: string;
  usesDirectFxUsd: boolean;
}): BundleAction[] {
  const actions: BundleAction[] = [];

  if (!args.usesDirectFxUsd) {
    actions.push({
      protocol: "enso",
      action: "route",
      args: {
        tokenIn: args.sourceTokenAddress,
        tokenOut: FXSAVE_CONFIG.base.fxUsd.address,
        amountIn: args.sourceAmountIn,
        receiver: args.receiver,
      },
    });
  }

  actions.push({
    protocol: "stargate",
    action: "bridge",
    args: {
      primaryAddress: FXSAVE_CONFIG.base.fxUsd.bridgePool,
      destinationChainId: FXSAVE_CONFIG.destinationChainId,
      tokenIn: FXSAVE_CONFIG.base.fxUsd.address,
      amountIn: args.usesDirectFxUsd ? args.sourceAmountIn : { useOutputOfCallAt: 0 },
      receiver: args.receiver,
      callback: [
        {
          protocol: "enso",
          action: "balance",
          args: {
            token: FXSAVE_CONFIG.mainnet.fxUsd.address,
          },
        },
        {
          protocol: "fx-save",
          action: "deposit",
          args: {
            primaryAddress: FXSAVE_CONFIG.mainnet.fxSave.primaryAddress,
            tokenIn: FXSAVE_CONFIG.mainnet.fxUsd.address,
            tokenOut: FXSAVE_CONFIG.mainnet.fxSave.address,
            amountIn: args.bridgedFxUsdAmount,
            receiver: args.receiver,
          },
        },
        {
          protocol: "stargate",
          action: "bridge",
          args: {
            primaryAddress: FXSAVE_CONFIG.mainnet.fxSave.bridgePool,
            destinationChainId: FXSAVE_CONFIG.sourceChainId,
            tokenIn: FXSAVE_CONFIG.mainnet.fxSave.address,
            amountIn: args.fxSaveAmount,
            receiver: args.receiver,
          },
        },
      ],
    },
  });

  return actions;
}

function buildRedeemActions(args: {
  amountIn: string;
  receiver: string;
  targetTokenAddress: string;
}): BundleAction[] {
  const redeemCallback: BundleAction[] = [
    {
      protocol: "enso",
      action: "balance",
      args: {
        token: FXSAVE_CONFIG.mainnet.fxSave.address,
      },
    },
    {
      protocol: "fx-save",
      action: "redeem",
      args: {
        primaryAddress: FXSAVE_CONFIG.mainnet.fxSave.primaryAddress,
        tokenIn: FXSAVE_CONFIG.mainnet.fxSave.address,
        tokenOut: FXSAVE_CONFIG.mainnet.fxUsd.address,
        amountIn: { useOutputOfCallAt: 0 },
        receiver: args.receiver,
      },
    },
  ];

  if (args.targetTokenAddress.toLowerCase() === FXSAVE_CONFIG.base.fxUsd.address.toLowerCase()) {
    redeemCallback.push({
      protocol: "stargate",
      action: "bridge",
      args: {
        primaryAddress: FXSAVE_CONFIG.mainnet.fxUsd.bridgePool,
        destinationChainId: FXSAVE_CONFIG.sourceChainId,
        tokenIn: FXSAVE_CONFIG.mainnet.fxUsd.address,
        amountIn: { useOutputOfCallAt: 1 },
        receiver: args.receiver,
      },
    });
  } else {
    redeemCallback.push({
      protocol: "enso",
      action: "route",
      args: {
        tokenIn: FXSAVE_CONFIG.mainnet.fxUsd.address,
        tokenOut: args.targetTokenAddress,
        amountIn: { useOutputOfCallAt: 1 },
        destinationChainId: FXSAVE_CONFIG.sourceChainId,
        receiver: args.receiver,
      },
    });
  }

  return [
    {
      protocol: "stargate",
      action: "bridge",
      args: {
        primaryAddress: FXSAVE_CONFIG.base.fxSave.bridgePool,
        destinationChainId: FXSAVE_CONFIG.destinationChainId,
        tokenIn: FXSAVE_CONFIG.base.fxSave.address,
        amountIn: args.amountIn,
        receiver: args.receiver,
        callback: redeemCallback,
      },
    },
  ];
}

async function fetchEnsoBundle(args: {
  actions: BundleAction[];
  apiKey?: string;
  delayMs?: number;
  fromAddress: string;
  receiver: string;
  referralCode?: string;
}) {
  if (args.delayMs && args.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, args.delayMs));
  }

  const query = new URLSearchParams({
    chainId: String(FXSAVE_CONFIG.sourceChainId),
    fromAddress: args.fromAddress,
    receiver: args.receiver,
    routingStrategy: FXSAVE_CONFIG.routingStrategy,
  });

  if (args.referralCode) {
    query.set("referralCode", args.referralCode);
  }

  const url = `https://api.enso.finance/api/v1/shortcuts/bundle?${query.toString()}`;
  const headers: HeadersInit = {
    accept: "application/json",
    "content-type": "application/json",
  };

  if (args.apiKey) {
    headers.Authorization = `Bearer ${args.apiKey}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  const upstream = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(args.actions),
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

  return {
    url,
    parsed,
    status: upstream.status,
    ok: upstream.ok,
  };
}

export async function POST(request: Request) {
  const originError = enforceTrustedOrigin(request);

  if (originError) {
    return originError;
  }

  const rateLimitError = enforceRateLimit(request, {
    limit: 20,
    routeKey: "fxsave-bundle",
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
  const direction = body.direction === "redeem" ? "redeem" : "mint";
  const fromAddress = body.fromAddress?.trim();
  const receiver = body.receiver?.trim() || fromAddress;
  const sourceTokenAddress = body.sourceTokenAddress?.trim();
  let sourceTokenSymbol = body.sourceTokenSymbol?.trim() || "TOKEN";
  let sourceTokenDecimals = Number(body.sourceTokenDecimals);
  const targetTokenAddress = body.targetTokenAddress?.trim();
  let targetTokenSymbol = body.targetTokenSymbol?.trim() || "TOKEN";
  let targetTokenDecimals = Number(body.targetTokenDecimals);
  const customTokensEnabled =
    process.env.NODE_ENV !== "production" || process.env.FXSAVE_ENABLE_CUSTOM_TOKENS === "true";
  const includeDiagnostics = process.env.NODE_ENV !== "production";

  if (!amount) {
    return badRequest("Amount is required.");
  }

  if (!fromAddress || !isAddress(fromAddress)) {
    return badRequest("A valid wallet address is required.");
  }

  if (!receiver || !isAddress(receiver)) {
    return badRequest("A valid receiver address is required.");
  }

  if (direction === "mint") {
    if (!sourceTokenAddress || !isAddress(sourceTokenAddress)) {
      return badRequest("A valid source token address is required.");
    }

    const presetSourceToken = getBaseTokenOptionByAddress(sourceTokenAddress);

    if (!customTokensEnabled && !presetSourceToken) {
      return badRequest("Custom source tokens are disabled in production.");
    }

    if (presetSourceToken) {
      sourceTokenSymbol = presetSourceToken.symbol;
      sourceTokenDecimals = presetSourceToken.decimals;
    }

    if (!Number.isInteger(sourceTokenDecimals) || sourceTokenDecimals < 0 || sourceTokenDecimals > 36) {
      return badRequest("Source token decimals must be an integer between 0 and 36.");
    }
  } else {
    if (!targetTokenAddress || !isAddress(targetTokenAddress)) {
      return badRequest("A valid target token address is required.");
    }

    const presetTargetToken = getBaseTokenOptionByAddress(targetTokenAddress);

    if (!customTokensEnabled && !presetTargetToken) {
      return badRequest("Custom target tokens are disabled in production.");
    }

    if (presetTargetToken) {
      targetTokenSymbol = presetTargetToken.symbol;
      targetTokenDecimals = presetTargetToken.decimals;
    }

    if (!Number.isInteger(targetTokenDecimals) || targetTokenDecimals < 0 || targetTokenDecimals > 36) {
      return badRequest("Target token decimals must be an integer between 0 and 36.");
    }
  }

  let amountIn: string;

  try {
    amountIn = parseUnits(
      amount,
      direction === "mint" ? sourceTokenDecimals : FXSAVE_CONFIG.base.fxSave.decimals,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid amount.";
    return badRequest(message);
  }

  if (amountIn === "0") {
    return badRequest("Amount must be greater than zero.");
  }

  const referralCode = process.env.ENSO_REFERRAL_CODE?.trim();
  const apiKey = process.env.ENSO_API_KEY?.trim();
  const waitMs = apiKey ? 0 : 1200;

  try {
    if (direction === "mint") {
      const usesDirectFxUsd =
        sourceTokenAddress!.toLowerCase() === FXSAVE_CONFIG.base.fxUsd.address.toLowerCase();

      const bridgeQuoteActions = buildMintBridgeQuoteActions({
        amountIn,
        receiver,
        sourceTokenAddress: sourceTokenAddress!,
        usesDirectFxUsd,
      });

      const bridgeQuote = await fetchEnsoBundle({
        actions: bridgeQuoteActions,
        apiKey,
        fromAddress,
        receiver,
        referralCode,
      });

      if (!bridgeQuote.ok) {
        return NextResponse.json(
          {
            error: "Enso bridge quote failed.",
            status: bridgeQuote.status,
            ...(includeDiagnostics
              ? {
                  details: bridgeQuote.parsed,
                  request: {
                    url: bridgeQuote.url,
                    actions: bridgeQuoteActions,
                  },
                }
              : {}),
          },
          { status: bridgeQuote.status },
        );
      }

      let bridgedFxUsdAmount: string;

      try {
        bridgedFxUsdAmount = getSingleAmount(
          bridgeQuote.parsed,
          FXSAVE_CONFIG.mainnet.fxUsd.address,
          "minAmountsOut",
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Unable to resolve bridged fxUSD quote.",
            ...(includeDiagnostics
              ? {
                  details: bridgeQuote.parsed,
                  request: {
                    url: bridgeQuote.url,
                    actions: bridgeQuoteActions,
                  },
                }
              : {}),
          },
          { status: 500 },
        );
      }

      const depositQuoteActions = buildMintDepositQuoteActions({
        bridgedFxUsdAmount,
        receiver,
      });

      const depositQuote = await fetchEnsoBundle({
        actions: depositQuoteActions,
        apiKey,
        delayMs: waitMs,
        fromAddress,
        receiver,
        referralCode,
      });

      if (!depositQuote.ok) {
        return NextResponse.json(
          {
            error: "Enso deposit quote failed.",
            status: depositQuote.status,
            ...(includeDiagnostics
              ? {
                  details: depositQuote.parsed,
                  request: {
                    url: depositQuote.url,
                    actions: depositQuoteActions,
                  },
                }
              : {}),
          },
          { status: depositQuote.status },
        );
      }

      let fxSaveAmount: string;

      try {
        fxSaveAmount = getSingleAmount(
          depositQuote.parsed,
          FXSAVE_CONFIG.mainnet.fxSave.address,
          "minAmountsOut",
        );
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Unable to resolve fxSAVE quote.",
            ...(includeDiagnostics
              ? {
                  details: depositQuote.parsed,
                  request: {
                    url: depositQuote.url,
                    actions: depositQuoteActions,
                  },
                }
              : {}),
          },
          { status: 500 },
        );
      }

      const actions = buildMintExecutableActions({
        bridgedFxUsdAmount,
        fxSaveAmount,
        receiver,
        sourceAmountIn: amountIn,
        sourceTokenAddress: sourceTokenAddress!,
        usesDirectFxUsd,
      });

      const bundle = await fetchEnsoBundle({
        actions,
        apiKey,
        delayMs: waitMs,
        fromAddress,
        receiver,
        referralCode,
      });

      if (!bundle.ok) {
        return NextResponse.json(
          {
            error: "Enso executable bundle failed.",
            status: bundle.status,
            ...(includeDiagnostics
              ? {
                  details: bundle.parsed,
                  request: {
                    url: bundle.url,
                    actions,
                  },
                  quotes: {
                    bridgeQuote: bridgeQuote.parsed,
                    depositQuote: depositQuote.parsed,
                  },
                }
              : {}),
          },
          { status: bundle.status },
        );
      }

      return NextResponse.json({
        flow: getFlowSteps({
          direction,
          sourceTokenSymbol,
          targetTokenSymbol: FXSAVE_CONFIG.base.fxSave.symbol,
        }),
        result: bundle.parsed,
        quotePlan: {
          bridgedFxUsdAmount,
          fxSaveAmount,
          sourceToken: sourceTokenSymbol,
          targetToken: FXSAVE_CONFIG.base.fxSave.symbol,
          usesDirectFxUsd,
        },
        warnings: [
          "Bundle uses conservative min-quoted amounts inside the bridge callback to avoid Enso callback reference failures.",
          "If execution gets more favorable pricing than the quote, small residual balances can remain on the intermediate chain.",
        ],
        ...(includeDiagnostics
          ? {
              request: {
                url: bundle.url,
                actions,
              },
            }
          : {}),
      });
    }

    const actions = buildRedeemActions({
      amountIn,
      receiver,
      targetTokenAddress: targetTokenAddress!,
    });

    const bundle = await fetchEnsoBundle({
      actions,
      apiKey,
      fromAddress,
      receiver,
      referralCode,
    });

    if (!bundle.ok) {
      return NextResponse.json(
        {
          error: "Enso executable bundle failed.",
          status: bundle.status,
          ...(includeDiagnostics
            ? {
                details: bundle.parsed,
                request: {
                  url: bundle.url,
                  actions,
                },
              }
            : {}),
        },
        { status: bundle.status },
      );
    }

    return NextResponse.json({
      flow: getFlowSteps({
        direction,
        sourceTokenSymbol: FXSAVE_CONFIG.base.fxSave.symbol,
        targetTokenSymbol,
      }),
      result: bundle.parsed,
      quotePlan: {
        sourceToken: FXSAVE_CONFIG.base.fxSave.symbol,
        targetToken: targetTokenSymbol,
      },
      warnings: [
        "This route is asynchronous across Base and Ethereum mainnet, so the final output can take a few minutes to settle on Base.",
        "If pricing improves versus quote, small residual balances can remain on the intermediate chain.",
      ],
      ...(includeDiagnostics
        ? {
            request: {
              url: bundle.url,
              actions,
            },
          }
        : {}),
    });
  } catch (error) {
    const details =
      error instanceof Error && error.name === "AbortError"
        ? "Upstream Enso request timed out."
        : error instanceof Error
          ? error.message
          : "Unknown upstream error.";

    return NextResponse.json(
      {
        error: "Failed to reach Enso.",
        details,
      },
      { status: 502 },
    );
  }
}
