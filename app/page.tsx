import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import { FxsaveMintApp } from "@/fxsave/mint-app";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "fxSAVE Mint | Base to Mainnet via Enso",
  description:
    "Reservoir-style minting UX for depositing Base tokens, minting into fxSAVE through Enso, and settling back on Base.",
};

export default function Home() {
  return (
    <div className={ibmPlexSans.className}>
      <FxsaveMintApp />
    </div>
  );
}
