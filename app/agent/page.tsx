import type { Metadata } from "next";

import { FxsaveAgentPage } from "@/fxsave/agent-page";

export const metadata: Metadata = {
  title: "fxSAVE Agent | Skill, API, and CLI",
  description:
    "Agent-first landing page for the fxSAVE dApp. Install the skill, inspect the API surface, and orchestrate mint and redeem flows on Base.",
};

export default function AgentPage() {
  return <FxsaveAgentPage />;
}
