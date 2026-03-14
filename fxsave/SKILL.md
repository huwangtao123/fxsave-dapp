---
name: fxsave
description: Use the fxSAVE website APIs to mint fxSAVE from Base assets or redeem fxSAVE back into Base assets. Use when the user wants to mint fxSAVE, redeem fxSAVE, preview the route, build an executable bundle, or execute the approval plus transaction flow for either direction.
---

# fxsave

Version: `v0.2.0`

Use this skill when the task is to operate the fxSAVE Enso flow through the website backend, not by manually reconstructing Enso payloads from scratch.

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
- CLI helper: `/Users/taowang/workspace/skills/smart-welcome/fxsave-dapp/fxsave/scripts/fxsave_cli.py`

Read [references/api.md](references/api.md) before building requests.

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

- App logic: `/Users/taowang/workspace/skills/smart-welcome/fxsave-dapp/fxsave/fxsave-mint-app.tsx`
- Bundle route: `/Users/taowang/workspace/skills/smart-welcome/fxsave-dapp/fxsave/fxsave-bundle-route.ts`
- Approval route: `/Users/taowang/workspace/skills/smart-welcome/fxsave-dapp/fxsave/fxsave-approve-route.ts`
- Token config: `/Users/taowang/workspace/skills/smart-welcome/fxsave-dapp/fxsave/fxsave.ts`
- CLI helper: `/Users/taowang/workspace/skills/smart-welcome/fxsave-dapp/fxsave/scripts/fxsave_cli.py`

## Response handling

- Use `result.tx.to`, `result.tx.data`, and `result.tx.value` to execute
- Use `minAmountsOut` first for conservative display
- Use `amountsOut` only as a secondary optimistic estimate
- Use `bridgingEstimates` to explain expected wait time

## When to read more

- Read [references/api.md](references/api.md) for request and response payloads
- Read the app files only if the backend behavior appears stale or mismatched
- Use `/Users/taowang/workspace/skills/smart-welcome/fxsave-dapp/fxsave/scripts/fxsave_cli.py` for quick local preview runs
