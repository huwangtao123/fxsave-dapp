import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { FxsaveAgentPage } from "@/fxsave/fxsave-agent-page";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "fxSAVE Agent | Skill, API, and CLI",
  description:
    "Agent-first landing page for the fxSAVE dApp. Install the skill, inspect the API surface, and orchestrate mint and redeem flows on Base.",
};

export default function AgentPage() {
  return (
    <div className={`${ibmPlexSans.className} ${ibmPlexMono.className}`}>
      <FxsaveAgentPage />
    </div>
  );
}
