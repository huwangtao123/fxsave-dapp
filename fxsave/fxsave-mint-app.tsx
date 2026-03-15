"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  CircleDashed,
  ExternalLink,
  Flame,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Waves,
} from "lucide-react";
import { erc20Abi, type Address, type Hex } from "viem";
import {
  useAccount,
  useConnect,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "wagmi/chains";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FXSAVE_CONFIG,
  formatPercent,
  FxsaveDirection,
  isAddress,
  parseUnits,
} from "@/fxsave/fxsave";
import { FxsaveTopMenu } from "@/fxsave/fxsave-top-menu";

type PresetToken = (typeof FXSAVE_CONFIG.baseTokenOptions)[number];

type ApiState = {
  error?: string;
  flow?: string[];
  quotePlan?: unknown;
  requestActions?: unknown;
  requestUrl?: string;
  response?: unknown;
  warnings?: string[];
};

type EnsoExecutionTx = {
  data?: string;
  from?: string;
  to: string;
  value?: string;
};

type ApprovalTx = {
  amount?: string;
  data?: string;
  spender?: string;
  to: string;
  value?: string;
};

type BundleAmounts = {
  amountsOut?: Record<string, string>;
  minAmountsOut?: Record<string, string>;
};

type ExecutionStage =
  | "idle"
  | "approving"
  | "switching"
  | "prompting"
  | "submitted"
  | "confirmed";

const SHOW_DEBUG_DETAILS = process.env.NODE_ENV !== "production";

const PRESET_TOKEN_MAP = new Map<string, PresetToken>(
  FXSAVE_CONFIG.baseTokenOptions.map((token) => [token.symbol, token]),
);

const FXSAVE_TOKEN = {
  symbol: FXSAVE_CONFIG.base.fxSave.symbol,
  address: FXSAVE_CONFIG.base.fxSave.address,
  decimals: FXSAVE_CONFIG.base.fxSave.decimals,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return fallback;
}

function extractExecutionTx(payload: unknown): EnsoExecutionTx | null {
  if (!isRecord(payload)) {
    return null;
  }

  const tx = payload.tx;

  if (!isRecord(tx) || typeof tx.to !== "string") {
    return null;
  }

  return {
    data: typeof tx.data === "string" ? tx.data : undefined,
    from: typeof tx.from === "string" ? tx.from : undefined,
    to: tx.to,
    value: typeof tx.value === "string" ? tx.value : undefined,
  };
}

function extractApprovalTx(payload: unknown): ApprovalTx | null {
  if (!isRecord(payload)) {
    return null;
  }

  const tx = isRecord(payload.tx) ? payload.tx : payload;

  if (!isRecord(tx) || typeof tx.to !== "string") {
    return null;
  }

  return {
    amount: typeof payload.amount === "string" ? payload.amount : undefined,
    data: typeof tx.data === "string" ? tx.data : undefined,
    spender: typeof payload.spender === "string" ? payload.spender : undefined,
    to: tx.to,
    value: typeof tx.value === "string" ? tx.value : undefined,
  };
}

function shortAddress(value?: string) {
  if (!value || value.length < 10) {
    return value ?? "Not connected";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTokenAmount(value: string, decimals: number, fractionDigits = 4) {
  const normalized = value.replace(/^0+/, "") || "0";
  const padded = normalized.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals) || "0";
  const fraction = padded.slice(padded.length - decimals).replace(/0+$/, "");

  if (!fraction) {
    return whole;
  }

  return `${whole}.${fraction.slice(0, fractionDigits)}`;
}

function extractBundleAmounts(payload: unknown): BundleAmounts | null {
  if (!isRecord(payload)) {
    return null;
  }

  const amountsOut = isRecord(payload.amountsOut)
    ? (payload.amountsOut as Record<string, string>)
    : undefined;
  const minAmountsOut = isRecord(payload.minAmountsOut)
    ? (payload.minAmountsOut as Record<string, string>)
    : undefined;

  if (!amountsOut && !minAmountsOut) {
    return null;
  }

  return {
    amountsOut,
    minAmountsOut,
  };
}

function getExplorerUrl(hash: string) {
  return `https://basescan.org/tx/${hash}`;
}

function getExecutionLabel(args: {
  confirming: boolean;
  connected: boolean;
  direction: FxsaveDirection;
  loading: boolean;
  sourceTokenSymbol: string;
  stage: ExecutionStage;
  sending: boolean;
  switching: boolean;
}) {
  if (args.loading) {
    return "Building bundle";
  }

  if (args.stage === "approving") {
    return `Approving ${args.sourceTokenSymbol}`;
  }

  if (args.switching) {
    return "Switching to Base";
  }

  if (args.sending || args.stage === "prompting") {
    return "Awaiting wallet signature";
  }

  if (args.confirming || args.stage === "submitted") {
    return "Waiting for Base confirmation";
  }

  if (args.connected) {
    return args.direction === "mint" ? "Mint and send transaction" : "Redeem and send transaction";
  }

  return "Connect wallet";
}

export function FxsaveMintApp() {
  const [direction, setDirection] = useState<FxsaveDirection>("mint");
  const [amount, setAmount] = useState("1");
  const [selectedAsset, setSelectedAsset] = useState("fxUSD");
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [customTokenSymbol, setCustomTokenSymbol] = useState("TOKEN");
  const [customTokenDecimals, setCustomTokenDecimals] = useState("18");
  const [loading, setLoading] = useState(false);
  const [apiState, setApiState] = useState<ApiState>({});
  const [executionStage, setExecutionStage] = useState<ExecutionStage>("idle");
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const [walletError, setWalletError] = useState<string>();
  const [sourceTokenBalance, setSourceTokenBalance] = useState<bigint | null>(null);
  const [isLoadingSourceTokenBalance, setIsLoadingSourceTokenBalance] = useState(false);

  const presetToken = PRESET_TOKEN_MAP.get(selectedAsset);
  const variableToken = presetToken ?? {
    symbol: customTokenSymbol || "TOKEN",
    address: customTokenAddress,
    decimals: Number(customTokenDecimals) || 18,
  };

  const sourceToken = direction === "mint" ? variableToken : FXSAVE_TOKEN;
  const targetToken = direction === "mint" ? FXSAVE_TOKEN : variableToken;

  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { sendTransactionAsync, isPending: isSendingTransaction } = useSendTransaction();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const {
    error: receiptError,
    isLoading: isConfirmingReceipt,
    isSuccess: isReceiptConfirmed,
  } = useWaitForTransactionReceipt({
    chainId: base.id,
    hash: txHash,
    query: {
      enabled: Boolean(txHash),
    },
  });

  const bundleAmounts = extractBundleAmounts(apiState.response);
  const executionLabel = getExecutionLabel({
    confirming: isConfirmingReceipt,
    connected: isConnected,
    direction,
    loading,
    sending: isSendingTransaction,
    sourceTokenSymbol: sourceToken.symbol,
    stage: executionStage,
    switching: isSwitchingChain,
  });
  const estimatedTargetOutput =
    bundleAmounts?.minAmountsOut?.[targetToken.address.toLowerCase()] ??
    bundleAmounts?.amountsOut?.[targetToken.address.toLowerCase()];
  const estimatedTargetDisplay = estimatedTargetOutput
    ? `${formatTokenAmount(estimatedTargetOutput, targetToken.decimals)} ${targetToken.symbol}`
    : `Build a bundle to preview ${targetToken.symbol}`;
  const sourceTokenBalanceDisplay = !isConnected
    ? `0 ${sourceToken.symbol}`
    : isLoadingSourceTokenBalance
      ? `Loading ${sourceToken.symbol}...`
      : sourceTokenBalance !== null
        ? `${formatTokenAmount(sourceTokenBalance.toString(), sourceToken.decimals)} ${sourceToken.symbol}`
        : `0 ${sourceToken.symbol}`;

  useEffect(() => {
    if (!SHOW_DEBUG_DETAILS && selectedAsset === "custom") {
      setSelectedAsset(FXSAVE_CONFIG.baseTokenOptions[0].symbol);
    }
  }, [selectedAsset]);

  useEffect(() => {
    if (isReceiptConfirmed) {
      setExecutionStage("confirmed");
    }
  }, [isReceiptConfirmed]);

  useEffect(() => {
    if (!isConnected || !address || !publicClient || !isAddress(sourceToken.address)) {
      setSourceTokenBalance(null);
      setIsLoadingSourceTokenBalance(false);
      return;
    }

    const client = publicClient;
    const account = address as Address;
    let cancelled = false;

    async function loadSourceTokenBalance() {
      setIsLoadingSourceTokenBalance(true);

      try {
        const balance = await client.readContract({
          abi: erc20Abi,
          address: sourceToken.address as Address,
          args: [account],
          functionName: "balanceOf",
        });

        if (!cancelled) {
          setSourceTokenBalance(balance);
        }
      } catch {
        if (!cancelled) {
          setSourceTokenBalance(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSourceTokenBalance(false);
        }
      }
    }

    void loadSourceTokenBalance();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, publicClient, sourceToken.address, sourceToken.symbol, sourceToken.decimals]);

  async function handleConnectWallet() {
    setWalletError(undefined);

    const connector = connectors[0];

    if (!connector) {
      setWalletError("No compatible wallet connector found. Install a Base-compatible browser wallet.");
      return;
    }

    try {
      await connectAsync({ connector });
    } catch (error) {
      setWalletError(getErrorMessage(error, "Wallet connection failed."));
    }
  }

  function handleFlipDirection() {
    setDirection((current) => (current === "mint" ? "redeem" : "mint"));
    setApiState({});
    setWalletError(undefined);
    setExecutionStage("idle");
    setTxHash(undefined);
  }

  async function ensureSourceTokenApproval() {
    if (!address) {
      throw new Error("Connect a wallet before approving tokens.");
    }

    const amountIn = parseUnits(amount, sourceToken.decimals);
    const response = await fetch("/api/fxsave/fxsave-approve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        amount: amountIn,
        fromAddress: address,
        tokenAddress: sourceToken.address,
      }),
    });

    const data = (await response.json()) as {
      details?: unknown;
      error?: string;
      result?: unknown;
    };

    if (!response.ok) {
      const message =
        data.error ?? (typeof data.details === "string" ? data.details : "Approval request failed.");
      throw new Error(message);
    }

    const approvalTx = extractApprovalTx(data.result);

    if (!approvalTx) {
      throw new Error("Approval transaction payload was missing.");
    }

    if (!approvalTx.spender || !approvalTx.amount) {
      throw new Error("Approval payload did not include spender or amount.");
    }

    if (!publicClient) {
      throw new Error("Base public client is unavailable for allowance checks.");
    }

    const allowance = await publicClient.readContract({
      abi: erc20Abi,
      address: sourceToken.address as Address,
      args: [address, approvalTx.spender as Address],
      functionName: "allowance",
    });

    if (allowance >= BigInt(approvalTx.amount)) {
      return;
    }

    const request: {
      account: Address;
      chainId: number;
      data?: Hex;
      to: Address;
      value?: bigint;
    } = {
      account: address,
      chainId: base.id,
      to: approvalTx.to as Address,
    };

    if (approvalTx.data) {
      request.data = approvalTx.data as Hex;
    }

    if (approvalTx.value && approvalTx.value !== "0") {
      request.value = BigInt(approvalTx.value);
    }

    setExecutionStage("approving");
    const hash = await sendTransactionAsync(request);

    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function executeTransaction(result: unknown) {
    if (!address) {
      throw new Error("Connect a wallet before sending the transaction.");
    }

    const tx = extractExecutionTx(result);

    if (!tx) {
      throw new Error("Bundle did not include an executable transaction.");
    }

    if (tx.from && tx.from.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Rebuild the bundle with the connected wallet address before sending.");
    }

    if (chainId !== base.id) {
      if (!switchChainAsync) {
        throw new Error("Switch your wallet to Base before sending.");
      }

      setExecutionStage("switching");
      await switchChainAsync({ chainId: base.id });
    }

    await ensureSourceTokenApproval();

    const request: {
      account: Address;
      chainId: number;
      data?: Hex;
      to: Address;
      value?: bigint;
    } = {
      account: address,
      chainId: base.id,
      to: tx.to as Address,
    };

    if (tx.data) {
      request.data = tx.data as Hex;
    }

    if (tx.value && tx.value !== "0") {
      request.value = BigInt(tx.value);
    }

    setExecutionStage("prompting");
    const hash = await sendTransactionAsync(request);
    setTxHash(hash);
    setExecutionStage("submitted");
  }

  async function buildBundle() {
    const payload: Record<string, unknown> = {
      amount,
      direction,
      fromAddress: address,
      receiver: address,
    };

    if (direction === "mint") {
      payload.sourceTokenAddress = sourceToken.address;
      payload.sourceTokenSymbol = sourceToken.symbol;
      payload.sourceTokenDecimals = sourceToken.decimals;
    } else {
      payload.targetTokenAddress = targetToken.address;
      payload.targetTokenSymbol = targetToken.symbol;
      payload.targetTokenDecimals = targetToken.decimals;
    }

    const response = await fetch("/api/fxsave/fxsave-bundle", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      details?: unknown;
      error?: string;
      flow?: string[];
      quotePlan?: unknown;
      request?: {
        actions?: unknown;
        url?: string;
      };
      result?: unknown;
      warnings?: string[];
    };

    if (!response.ok) {
      const message =
        data.error ?? (typeof data.details === "string" ? data.details : "Bundle request failed.");

      setApiState({
        error: message,
        flow: data.flow,
        quotePlan: data.quotePlan,
        requestActions: data.request?.actions,
        requestUrl: data.request?.url,
        response: data.details,
        warnings: data.warnings,
      });

      return null;
    }

    setApiState({
      flow: data.flow,
      quotePlan: data.quotePlan,
      requestActions: data.request?.actions,
      requestUrl: data.request?.url,
      response: data.result,
      warnings: data.warnings,
    });

    return data;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConnected) {
      await handleConnectWallet();
      return;
    }

    setLoading(true);
    setApiState({});
    setWalletError(undefined);
    setExecutionStage("idle");
    setTxHash(undefined);

    try {
      const data = await buildBundle();

      if (!data || !isConnected) {
        return;
      }

      await executeTransaction(data.result);
    } catch (error) {
      setWalletError(getErrorMessage(error, "Unexpected request failure."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#041018] font-mono text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(7,63,72,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(7,63,72,0.14)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,225,255,0.08),transparent_26%),linear-gradient(180deg,rgba(4,16,24,0.24),#041018_76%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <FxsaveTopMenu active="home" />

        <header className="mb-8 mt-8 space-y-5">
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Mint and redeem <span className="text-cyan-300">fxSAVE on Base</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              Use one view to move from Base assets into fxSAVE, or flip direction and exit fxSAVE back into Base assets.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              icon={<Flame className="size-4" />}
              label="Mainnet APY"
              value={formatPercent(FXSAVE_CONFIG.mainnet.fxSave.apy)}
            />
            <MetricCard icon={<Waves className="size-4" />} label="From" value={sourceToken.symbol} />
            <MetricCard icon={<ShieldCheck className="size-4" />} label="To" value={targetToken.symbol} />
          </div>
        </header>

        <main className="space-y-6">
          <Card className="overflow-hidden border-cyan-400/25 bg-[rgba(4,16,24,0.76)] shadow-none backdrop-blur-none">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">fxSAVE</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {direction === "mint" ? "Build the mint round-trip" : "Exit the fxSAVE position"}
                  </h2>
                </div>
                <Badge className="border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                  {direction === "mint" ? "Mode: Mint" : "Mode: Redeem"}
                </Badge>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="overflow-hidden border border-cyan-400/25 bg-[rgba(4,16,24,0.72)]">
                  <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.4fr)_180px_140px]">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Amount to deposit
                      </label>
                      <input
                        className="h-14 w-full border border-cyan-400/25 bg-[#020b11] px-4 text-2xl font-semibold text-white outline-none transition placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/60"
                        inputMode="decimal"
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="0"
                        value={amount}
                      />
                      <p className="mt-2 text-sm text-slate-400">Balance: {sourceTokenBalanceDisplay}</p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Asset</label>
                      {direction === "mint" ? (
                        <TokenSelect value={selectedAsset} onChange={setSelectedAsset} />
                      ) : (
                        <StaticField value={FXSAVE_TOKEN.symbol} />
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Network
                      </label>
                      <StaticField value="Base" />
                    </div>
                  </div>

                  <div className="border-y border-white/10 px-5 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        aria-label="Flip mint direction"
                        className="flex size-14 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-300/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                        onClick={handleFlipDirection}
                        type="button"
                      >
                        <ArrowUpDown className="size-5" />
                      </button>
                    </div>
                    <p className="mt-3 text-center text-sm text-slate-400">
                      {sourceToken.symbol} to {targetToken.symbol}
                    </p>
                  </div>

                  <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.4fr)_180px_140px]">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Amount to receive
                      </label>
                      <div className="flex h-14 items-center border border-cyan-400/25 bg-[#020b11] px-4 text-2xl font-semibold text-white">
                        {estimatedTargetOutput
                          ? formatTokenAmount(estimatedTargetOutput, targetToken.decimals)
                          : "0"}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Asset</label>
                      {direction === "mint" ? (
                        <StaticField value={FXSAVE_TOKEN.symbol} />
                      ) : (
                        <TokenSelect value={selectedAsset} onChange={setSelectedAsset} />
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Network
                      </label>
                      <StaticField value="Base" />
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div className="bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
                      Estimated output on Base: {estimatedTargetDisplay}
                    </div>
                  </div>
                </div>

                <Button
                  className="h-14 w-full bg-cyan-300 text-[#041018] transition hover:bg-cyan-200"
                  disabled={isConnecting || loading || isSendingTransaction || isSwitchingChain || isConfirmingReceipt}
                  size="lg"
                  type="submit"
                >
                  {isConnecting || loading || isSendingTransaction || isSwitchingChain || isConfirmingReceipt ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      {executionLabel}
                    </>
                  ) : (
                    <>
                      <CircleDashed className="size-4" />
                      {executionLabel}
                    </>
                  )}
                </Button>
                {!isConnected ? (
                  <p className="text-center text-sm text-slate-400">
                    Connect your wallet from the top right to continue.
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>

          {walletError || apiState.error || receiptError || txHash ? (
            <div className="space-y-3">
              {apiState.error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {apiState.error}
                </div>
              ) : null}

              {walletError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {walletError}
                </div>
              ) : null}

              {receiptError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {getErrorMessage(receiptError, "Transaction confirmation failed.")}
                </div>
              ) : null}

              {txHash ? (
                <a
                  className="flex items-center justify-between rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-4 text-sm text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-300/14"
                  href={getExplorerUrl(txHash)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="font-mono">{shortAddress(txHash)}</span>
                  <ExternalLink className="size-4 shrink-0" />
                </a>
              ) : null}
            </div>
          ) : null}

          {SHOW_DEBUG_DETAILS ? (
            <details className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
              <summary className="cursor-pointer list-none font-medium text-white">
                Advanced details
              </summary>
              <div className="mt-4 space-y-4">
                {selectedAsset === "custom" ? (
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_120px]">
                    <TextInput
                      label="Custom Base asset"
                      onChange={setCustomTokenAddress}
                      placeholder="0x..."
                      value={customTokenAddress}
                    />
                    <TextInput
                      label="Symbol"
                      onChange={setCustomTokenSymbol}
                      placeholder="TOKEN"
                      value={customTokenSymbol}
                    />
                    <TextInput
                      label="Decimals"
                      onChange={setCustomTokenDecimals}
                      placeholder="18"
                      value={customTokenDecimals}
                    />
                  </div>
                ) : null}
                {apiState.error ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                    {apiState.error}
                  </div>
                ) : null}
                <OutputBlock
                  label="Bundle endpoint"
                  value={apiState.requestUrl ?? "Submit the form to build the Enso shortcut request."}
                />
                <CodeBlock
                  label="Quote plan"
                  value={
                    apiState.quotePlan
                      ? JSON.stringify(apiState.quotePlan, null, 2)
                      : "No quote plan yet."
                  }
                />
                <CodeBlock
                  label="Warnings"
                  value={
                    apiState.warnings?.length
                      ? JSON.stringify(apiState.warnings, null, 2)
                      : "No warnings yet."
                  }
                />
                <CodeBlock
                  label="Enso response"
                  value={
                    apiState.response
                      ? JSON.stringify(apiState.response, null, 2)
                      : "No API response yet."
                  }
                />
              </div>
            </details>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function TokenSelect(props: { onChange: (value: string) => void; value: string }) {
  return (
    <div className="relative">
      <select
        className="h-14 w-full appearance-none border border-cyan-400/25 bg-[#020b11] px-4 pr-10 text-base text-white outline-none transition hover:border-cyan-300/40 focus:border-cyan-300/40 focus-visible:ring-2 focus-visible:ring-cyan-300/60"
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      >
        {FXSAVE_CONFIG.baseTokenOptions.map((token) => (
          <option key={token.symbol} value={token.symbol}>
            {token.label}
          </option>
        ))}
        {SHOW_DEBUG_DETAILS ? <option value="custom">Custom token</option> : null}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function StaticField(props: { value: string }) {
  return (
    <div className="flex h-14 items-center border border-cyan-400/25 bg-[#020b11] px-4 text-base text-white">
      {props.value}
    </div>
  );
}

function MetricCard(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border border-cyan-400/25 bg-[rgba(4,16,24,0.76)] px-4 py-4 text-sm text-slate-300">
      <div className="mb-3 flex size-9 items-center justify-center bg-cyan-300/10 text-cyan-200">
        {props.icon}
      </div>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{props.value}</p>
    </div>
  );
}

function TextInput(props: {
  label: string;
  placeholder: string;
  readOnly?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{props.label}</span>
      <input
        className="h-12 w-full border border-cyan-400/25 bg-[#020b11] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/40 focus-visible:ring-2 focus-visible:ring-cyan-300/60 read-only:cursor-not-allowed read-only:opacity-80"
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        readOnly={props.readOnly}
        value={props.value}
      />
    </label>
  );
}

function OutputBlock(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{props.label}</p>
      <p className="mt-2 break-all font-mono text-sm text-slate-200">{props.value}</p>
    </div>
  );
}

function CodeBlock(props: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">{props.label}</p>
      <pre className="max-h-72 overflow-auto rounded-2xl border border-white/6 bg-[#02070a] p-4 text-xs leading-6 text-slate-200">
        <code>{props.value}</code>
      </pre>
    </div>
  );
}
