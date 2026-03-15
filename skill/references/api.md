# fxUSD Agent API Reference

Version: `v0.2.0`

This file documents the current app-facing API contract for agent use.

## CLI helper

Script:
- `/Users/taowang/workspace/skills/fxsave-dapp/skill/scripts/fxusd_cli.py`

Examples:

```bash
python3 /Users/taowang/workspace/skills/fxsave-dapp/skill/scripts/fxusd_cli.py mint \
  --from-address 0x... \
  --amount 1 \
  --source-token fxUSD
```

```bash
python3 /Users/taowang/workspace/skills/fxsave-dapp/skill/scripts/fxusd_cli.py redeem \
  --from-address 0x... \
  --amount 1 \
  --target-token USDC
```

```bash
python3 /Users/taowang/workspace/skills/fxsave-dapp/skill/scripts/fxusd_cli.py approval \
  --from-address 0x... \
  --amount 1 \
  --token fxSAVE
```

## Endpoint: `/api/fxsave/fxsave-bundle`

Method: `POST`

Purpose:
- Build an executable Enso bundle for `mint` or `redeem`

### Mint request

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

### Redeem request

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

### Success response shape

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
    "bridgingEstimates": [],
    "route": []
  },
  "quotePlan": {},
  "warnings": []
}
```

### Important fields

- `result.tx`: executable transaction payload
- `result.minAmountsOut`: conservative output estimate
- `result.amountsOut`: optimistic output estimate
- `result.bridgingEstimates`: settlement timing hints
- `flow`: human-readable step summary
- `warnings`: user-facing risk or timing notes

## Endpoint: `/api/fxsave/fxsave-approve`

Method: `POST`

Purpose:
- Build approval tx payload for the current source token

### Request

```json
{
  "amount": "1000000000000000000",
  "fromAddress": "0x...",
  "tokenAddress": "0x..."
}
```

`amount` must be raw units, not human-readable decimal text.

### Success response shape

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

## Agent execution pattern

1. Normalize direction and token metadata.
2. Build the bundle.
3. Identify the source token for the current direction.
4. Build approval payload for that source token.
5. Compare allowance before approval.
6. Submit approval if needed.
7. Submit main tx from `result.tx`.
8. Tell the user the cross-chain settlement may lag the source-chain confirmation.

## Production notes

- In production, the app limits allowed origins and rate limits the public API routes.
- In production, custom tokens can be disabled. Default support is the configured Base presets only.
- Detailed upstream Enso request payloads are intended for local debugging and may be omitted in production responses.

## Current direction mapping

### Mint

- Input: Base asset
- Output: Base `fxSAVE`
- Source token for approval: selected Base asset

### Redeem

- Input: Base `fxSAVE`
- Output: Base asset
- Source token for approval: Base `fxSAVE`
