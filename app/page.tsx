import type { Metadata } from "next";

import { FxsaveMintApp } from "@/fxsave/mint-app";

export const metadata: Metadata = {
  title: "fxSAVE Mint | Base to Mainnet via Enso",
  description:
    "Reservoir-style minting UX for depositing Base tokens, minting into fxSAVE through Enso, and settling back on Base.",
};

export default function Home() {
  return <FxsaveMintApp />;
}
