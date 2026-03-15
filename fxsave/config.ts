export const FXSAVE_CONFIG = {
  sourceChainId: 8453,
  destinationChainId: 1,
  routingStrategy: "router",
  base: {
    name: "Base",
    fxUsd: {
      symbol: "fxUSD",
      address: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
      decimals: 18,
      bridgePool: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
    },
    fxSave: {
      symbol: "fxSAVE",
      address: "0x273f20fa9fbe803e5d6959add9582dac240ec3be",
      decimals: 18,
      bridgePool: "0x273f20fa9fbe803e5d6959add9582dac240ec3be",
    },
  },
  mainnet: {
    name: "Ethereum",
    fxUsd: {
      symbol: "fxUSD",
      address: "0x085780639cc2cacd35e474e71f4d000e2405d8f6",
      decimals: 18,
      bridgePool: "0xa07d8cc424421cc2bce0544a65481376f010a438",
    },
    fxSave: {
      symbol: "fxSAVE",
      address: "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39",
      decimals: 18,
      bridgePool: "0xcad2b9c980322f460db51cc8e45539f677c73f86",
      primaryAddress: "0x33636d49fbefbe798e15e7f356e8dbef543cc708",
      apy: 4.35,
    },
  },
  baseTokenOptions: [
    {
      symbol: "fxUSD",
      label: "fxUSD",
      address: "0x55380fe7a1910dff29a47b622057ab4139da42c5",
      decimals: 18,
    },
    {
      symbol: "USDC",
      label: "USDC",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
    },
    {
      symbol: "WETH",
      label: "WETH",
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
  ],
} as const;

export type FxsaveDirection = "mint" | "redeem";

export type TokenInput = {
  symbol: string;
  address: string;
  decimals: number;
};

type BundleValueReference = {
  useOutputOfCallAt: number;
};

export type BundleAction = {
  protocol: string;
  action: string;
  args: Record<string, string | number | BundleValueReference | BundleAction[]>;
};

export function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function getBaseTokenOptionByAddress(address: string) {
  return FXSAVE_CONFIG.baseTokenOptions.find(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  );
}

export function parseUnits(value: string, decimals: number): string {
  const normalized = value.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Amount must be a positive number.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals);
  const combined = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, "");

  return combined || "0";
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getFlowSteps(args: {
  direction: FxsaveDirection;
  sourceTokenSymbol: string;
  targetTokenSymbol: string;
}): string[] {
  if (args.direction === "mint") {
    if (args.sourceTokenSymbol.toLowerCase() === FXSAVE_CONFIG.base.fxUsd.symbol.toLowerCase()) {
      return [
        "Bridge Base fxUSD to Ethereum mainnet",
        "Deposit mainnet fxUSD into fxSAVE",
        "Bridge minted fxSAVE back to Base",
      ];
    }

    return [
      `Route ${args.sourceTokenSymbol} into Base fxUSD`,
      "Bridge Base fxUSD to Ethereum mainnet",
      "Deposit mainnet fxUSD into fxSAVE",
      "Bridge minted fxSAVE back to Base",
    ];
  }

  if (args.targetTokenSymbol.toLowerCase() === FXSAVE_CONFIG.base.fxUsd.symbol.toLowerCase()) {
    return [
      "Bridge Base fxSAVE to Ethereum mainnet",
      "Redeem mainnet fxSAVE into mainnet fxUSD",
      "Bridge mainnet fxUSD back to Base",
    ];
  }

  return [
    "Bridge Base fxSAVE to Ethereum mainnet",
    "Redeem mainnet fxSAVE into mainnet fxUSD",
    `Route mainnet fxUSD into Base ${args.targetTokenSymbol}`,
  ];
}
