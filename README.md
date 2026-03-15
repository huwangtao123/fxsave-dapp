# fxsave-dapp

`fxsave-dapp` is a Next.js application for using `fxSAVE` on Base through Enso-powered shortcut bundles.

The point of this app and skill is to shortcut the manual cross-chain flow. Instead of having the user think through bridge-to-mainnet, deposit-or-redeem, and bridge-back steps by hand, the app lets them ask for a simple Base-side action and builds the required route behind the scenes.

It supports both directions in one UI:
- `mint`: Base asset -> Base `fxSAVE`
- `redeem`: Base `fxSAVE` -> Base asset

In practice, that means:
- `mint`: Base asset -> bridge to Ethereum mainnet -> deposit into `fxSAVE` -> bridge `fxSAVE` back to Base
- `redeem`: Base `fxSAVE` -> bridge to Ethereum mainnet -> redeem out of `fxSAVE` -> bridge the output asset back to Base

The app connects a wallet on Base, builds the required Enso bundle on the server, checks token approval when needed, and submits the final transaction from the browser.

## Features

- One-page mint and redeem flow
- Wallet connection with `wagmi`
- Base token support for `fxUSD`, `USDC`, and `WETH`
- `fxSAVE` redeem flow back into Base assets
- Server-side Enso bundle builder and approval builder
- Allowance-aware approval flow
- Transaction submission from the connected wallet
- Agent-friendly CLI for local bundle and approval planning

## Stack

- Next.js 16
- React 19
- TypeScript
- `wagmi`
- `viem`
- Enso shortcuts API

## Project structure

```text
fxsave-dapp/
├── app/
│   ├── api/fxsave/
│   │   ├── fxsave-approve/route.ts
│   │   └── fxsave-bundle/route.ts
│   ├── agent/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── fxsave/
│   ├── agent-page.tsx
│   ├── api-security.ts
│   ├── approve-route.ts
│   ├── bundle-route.ts
│   ├── config.ts
│   ├── mint-app.tsx
│   ├── top-menu.tsx
│   ├── wagmi-config.ts
│   └── wallet-provider.tsx
├── skill/
│   ├── SKILL.md
│   ├── references/api.md
│   └── scripts/fxusd_cli.py
├── components/
├── next.config.ts
├── package.json
└── README.md
```

## Core files

- App entry: `app/page.tsx`
- Agent entry: `app/agent/page.tsx`
- Shared wallet provider: `app/layout.tsx`
- Main UI: `fxsave/mint-app.tsx`
- Agent page UI: `fxsave/agent-page.tsx`
- Token and flow config: `fxsave/config.ts`
- Bundle API logic: `fxsave/bundle-route.ts`
- Approval API logic: `fxsave/approve-route.ts`
- API hardening: `fxsave/api-security.ts`
- Agent docs: `skill/SKILL.md`
- CLI helper: `skill/scripts/fxusd_cli.py`

## Supported flow

### Mint

1. User selects a Base asset.
2. App builds a `mint` bundle through `/api/fxsave/fxsave-bundle`.
3. App checks whether the source token allowance is already sufficient.
4. If needed, app requests approval through `/api/fxsave/fxsave-approve`.
5. App submits the executable Enso transaction from the wallet.
6. Cross-chain settlement completes asynchronously and final `fxSAVE` lands on Base.

### Redeem

1. User deposits Base `fxSAVE`.
2. App builds a `redeem` bundle through `/api/fxsave/fxsave-bundle`.
3. App checks `fxSAVE` allowance.
4. If needed, app sends approval first.
5. App submits the main Enso transaction.
6. Cross-chain settlement returns the selected Base asset to the wallet.

## Environment variables

Copy `.env.example` to `.env.local` in the project root.

```bash
cp .env.example .env.local
```

Then fill in the values:

```bash
ENSO_API_KEY=
ENSO_REFERRAL_CODE=
FXSAVE_TRUSTED_ORIGINS=
FXSAVE_ENABLE_CUSTOM_TOKENS=false
```

### Required

- `ENSO_API_KEY`
  Used by the server routes when calling Enso. Without it, the public Enso rate limit is much lower.

### Optional

- `ENSO_REFERRAL_CODE`
  Forwarded to Enso when present.

- `FXSAVE_TRUSTED_ORIGINS`
  Comma-separated allowlist for production API requests.
  Example:
  `FXSAVE_TRUSTED_ORIGINS=https://fxsave.example.com,https://www.fxsave.example.com`

- `FXSAVE_ENABLE_CUSTOM_TOKENS`
  Defaults to disabled in production. Only enable if you intentionally want to allow arbitrary Base token addresses.

## Local development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

Note: the repository still contains unrelated lint issues outside the `fxsave` flow, so full-project lint may report errors from other areas.

## API endpoints

### `POST /api/fxsave/fxsave-bundle`

Builds the Enso shortcut bundle for `mint` or `redeem`.

Returns:
- `flow`
- `quotePlan`
- `warnings`
- `result`

The executable transaction is in:

```json
result.tx
```

### `POST /api/fxsave/fxsave-approve`

Builds the approval payload for the current source token.

The frontend uses this response to:
- get `spender`
- get required `amount`
- compare current allowance
- skip approval if allowance is already sufficient

For payload examples, see:
- `skill/references/api.md`

## CLI helper

The project includes a local CLI for previewing bundle and approval plans without opening the UI:

`skill/scripts/fxusd_cli.py`

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

## Security notes

The app currently includes the following protections:

- Enso API key stays server-side
- Production origin validation for `fxsave` API routes
- Production in-memory rate limiting for public API routes
- Upstream request timeouts for Enso calls
- Production CSP and common security headers in `next.config.ts`
- Production default disables custom token input
- Production responses omit detailed Enso diagnostics unless running in development

Current limitations:

- Rate limiting is process-local memory only. For multi-instance deployment, replace it with a shared store such as Redis or Upstash.
- Wallet connector handling is currently simple and can be improved with a fuller wallet picker.
- Settlement is asynchronous across Base and Ethereum mainnet. A successful source-chain transaction does not mean final output has already arrived.

## Deployment notes

Before deploying:

1. Set `ENSO_API_KEY`.
2. Set `FXSAVE_TRUSTED_ORIGINS` to your production domain.
3. Keep `FXSAVE_ENABLE_CUSTOM_TOKENS=false` unless you explicitly need it.
4. Verify wallet flow on Base with a real browser wallet.
5. Confirm BaseScan links and cross-chain timing on production.

## Agent usage

This project includes agent-oriented docs in:

- `skill/SKILL.md`
- `skill/references/api.md`

Use those files when an agent needs to:
- plan a mint or redeem flow
- call the backend API instead of driving the browser
- explain approval and cross-chain settlement behavior

## Status

This repo is now organized with a clear split:
- `fxsave/` for runtime app logic
- `skill/` for agent docs and CLI tooling
