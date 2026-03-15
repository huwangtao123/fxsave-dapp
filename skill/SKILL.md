---
name: fxusd
description: Use when the user wants a shortcut to mint or redeem Base fxSAVE through the website backend, without manually bridging between Base and Ethereum mainnet or reconstructing Enso payloads by hand.
---

# fxusd

Version: `v0.2.1`

Use this skill when the task is to operate the fxSAVE Enso flow through the website backend, not by manually reconstructing Enso payloads from scratch.

## Why this skill exists

This skill turns the Base-side `fxSAVE` experience into a shortcut.

Without the shortcut, the user or agent would need to think through multiple hidden steps across Base and Ethereum mainnet. This skill packages those steps behind the app routes so the request can stay simple: mint `fxSAVE` or redeem `fxSAVE`.

## Shortcut model

### Mint fxSAVE

```text
Base asset
  -> bridge to Ethereum mainnet
  -> deposit into fxSAVE
  -> bridge fxSAVE back to Base
  -> receive Base fxSAVE
```

Examples of Base assets:
- `fxUSD`
- `USDC`
- `WETH`

### Redeem fxSAVE

```text
Base fxSAVE
  -> bridge to Ethereum mainnet
  -> redeem out of fxSAVE
  -> bridge the output asset back to Base
  -> receive the Base asset
```

Examples of Base outputs:
- `fxUSD`
- `USDC`
- `WETH`

The purpose of this skill is to let an agent work at the shortcut level, not at the manual bridge-and-deposit level.

## What this skill supports

- `mint`: Base asset -> Base `fxSAVE`
- `redeem`: Base `fxSAVE` -> Base asset
- Approval planning for the source token
- Executable bundle generation
- Transaction execution guidance
- Cross-chain settlement explanation

## Current app endpoints

- Bundle builder: `/api/fxsave/fxsave-bundle`
- Approval builder: `/api/fxsave/fxsave-approve`

This skill is self-contained. A local install only needs `SKILL.md`.

## Workflow

1. Determine direction.
- `mint`: user deposits a Base token and receives Base `fxSAVE`
- `redeem`: user deposits Base `fxSAVE` and receives a Base token

2. Resolve tokens.
- For `mint`, require `sourceTokenAddress`, `sourceTokenSymbol`, `sourceTokenDecimals`
- For `redeem`, require `targetTokenAddress`, `targetTokenSymbol`, `targetTokenDecimals`
- Use the connected wallet address for both `fromAddress` and `receiver`

3. Build the bundle.
- Call `/api/fxsave/fxsave-bundle`
- Read `flow`, `warnings`, `quotePlan`, and `result.tx`
- Treat the returned `tx` as the canonical executable payload

4. Check approval on the source token.
- Call `/api/fxsave/fxsave-approve` with the source token and raw amount
- Compare allowance before submitting approval
- Skip approval if allowance is already sufficient
- For local planning or agent testing, prefer the CLI helper before writing ad hoc requests

5. Execute.
- Submit approval first when needed
- Submit the main transaction second
- Tell the user that bridging and settlement are asynchronous

## API request shapes

### Bundle request

Mint:

```json
{
  "amount": "1",
  "direction": "mint",
  "fromAddress": "0x...",
  "receiver": "0x...",
  "sourceTokenAddress": "0x...",
  "sourceTokenSymbol": "fxUSD",
  "sourceTokenDecimals": 18
}
```

Redeem:

```json
{
  "amount": "1",
  "direction": "redeem",
  "fromAddress": "0x...",
  "receiver": "0x...",
  "targetTokenAddress": "0x...",
  "targetTokenSymbol": "USDC",
  "targetTokenDecimals": 6
}
```

Bundle success response:

```json
{
  "flow": [],
  "result": {
    "tx": {
      "to": "0x...",
      "from": "0x...",
      "data": "0x...",
      "value": "0"
    },
    "amountsOut": {},
    "minAmountsOut": {},
    "bridgingEstimates": []
  },
  "quotePlan": {},
  "warnings": []
}
```

### Approval request

```json
{
  "amount": "1000000000000000000",
  "fromAddress": "0x...",
  "tokenAddress": "0x..."
}
```

Approval success response:

```json
{
  "result": {
    "spender": "0x...",
    "amount": "1000000000000000000",
    "tx": {
      "to": "0x...",
      "data": "0x...",
      "value": "0"
    }
  }
}
```

## Source token rules

- `mint`: source token is the selected Base asset
- `redeem`: source token is always Base `fxSAVE`

The approval check must always use the actual source token for the current direction.

## Safety rules

- Do not assume same-chain instant completion. Both directions can include async cross-chain settlement.
- Do not invent token decimals. Use configured values.
- Do not bypass the app backend by composing raw Enso requests unless the website route is broken.
- Surface `warnings` and `flow` back to the user when execution is being planned.
- If bundle generation fails, report the route failure and stop instead of guessing a fallback transaction.
- In production, treat custom tokens as disabled unless `FXSAVE_ENABLE_CUSTOM_TOKENS=true` is explicitly set.

## Supported defaults

The app currently exposes these common Base assets:

- `fxUSD`
- `USDC`
- `WETH`
- `fxSAVE` as the redeem source token

Custom token support is intended for local debugging and can be disabled in production.

## Files to inspect when behavior changes

- App logic: `/Users/taowang/workspace/skills/fxsave-dapp/fxsave/mint-app.tsx`
- Bundle route: `/Users/taowang/workspace/skills/fxsave-dapp/fxsave/bundle-route.ts`
- Approval route: `/Users/taowang/workspace/skills/fxsave-dapp/fxsave/approve-route.ts`
- Token config: `/Users/taowang/workspace/skills/fxsave-dapp/fxsave/config.ts`

## Response handling

- Use `result.tx.to`, `result.tx.data`, and `result.tx.value` to execute
- Use `minAmountsOut` first for conservative display
- Use `amountsOut` only as a secondary optimistic estimate
- Use `bridgingEstimates` to explain expected wait time

## When to read more

- Read the app files only if the backend behavior appears stale or mismatched
