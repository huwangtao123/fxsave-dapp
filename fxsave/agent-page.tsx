"use client";

import { useEffect, useRef, useState } from "react";
import copy from "copy-to-clipboard";

import { FxsaveTopMenu } from "@/fxsave/top-menu";

const installCommand =
  "curl -Ls https://raw.githubusercontent.com/huwangtao123/fxsave-dapp/main/skill/SKILL.md";

const installSteps = [
  {
    number: "1.",
    body: "Run the command above. The output is the self-contained fxUSD skill file.",
  },
  {
    number: "2.",
    body: "Save it as SKILL.md or load it into your agent's skill system.",
  },
  {
    number: "3.",
    body: "Use the skill to route, monitor, and defend fxSAVE, Hydrex, and Morpho workflows with protocol-specific guardrails.",
  },
];

const userActions = [
  {
    title: "Mint fxSAVE",
    body: "Deposit all my fxUSD in wallet to fxSAVE.",
  },
  {
    title: "Use Hydrex",
    body: "Deposit 500 fxUSD into the safest stablecoin-farming Hydrex vault.",
  },
  {
    title: "Watch Morpho risk",
    body: "Alert me if my BNKR-backed fxUSD borrow moves into warning or critical territory.",
  },
  {
    title: "Repay Morpho debt",
    body: "Build a repay plan to lower risk on my Morpho fxUSD position.",
  },
  {
    title: "Add Morpho collateral",
    body: "Build an add-collateral plan for my BNKR-backed fxUSD borrow.",
  },
];

export function FxsaveAgentPage() {
  const [copied, setCopied] = useState(false);
  const copyButtonRef = useRef<HTMLButtonElement | null>(null);

  async function handleCopyInstall() {
    try {
      const didCopy = copy(installCommand);

      if (!didCopy) {
        throw new Error("Copy command failed");
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    const button = copyButtonRef.current;

    if (!button) {
      return;
    }

    const handleNativeClick = () => {
      void handleCopyInstall();
    };

    button.addEventListener("click", handleNativeClick);

    return () => {
      button.removeEventListener("click", handleNativeClick);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#041018] font-mono text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(7,63,72,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(7,63,72,0.14)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,225,255,0.1),transparent_26%),linear-gradient(180deg,rgba(4,16,24,0.28),#041018_76%)]" />

      <main className="relative mx-auto max-w-5xl px-6 py-10 sm:px-8 lg:px-10">
        <FxsaveTopMenu active="agent" />

        <section className="mx-auto max-w-3xl text-center">
          <h1 className="mt-12 text-5xl font-semibold tracking-tight text-cyan-300 sm:text-6xl">Hey, Agent</h1>
          <p className="mt-6 text-xl leading-9 text-slate-300">
            Install a skill that turns fragmented fxUSD strategies into one agent-friendly layer.
          </p>
          <p className="text-xl leading-9 text-slate-300">
            Cover fxSAVE shortcuts, Hydrex liquidity, and Morpho monitoring plus defense from one skill.
          </p>
        </section>

        <div className="mx-auto mt-12 max-w-5xl space-y-6">
          <section className="border border-cyan-400/30 bg-[rgba(4,16,24,0.76)] px-5 py-6 sm:px-6">
            <p className="text-3xl font-semibold text-cyan-300">{"// install"}</p>
            <div className="mt-6 border border-cyan-400/25 bg-[#020b11] px-4 py-4 text-base text-cyan-100">
              <div className="flex items-center justify-between gap-4">
                <code className="overflow-x-auto whitespace-nowrap pr-2">$ {installCommand}</code>
                <button
                  ref={copyButtonRef}
                  className="shrink-0 text-sm text-slate-400 transition hover:text-cyan-200"
                  type="button"
                >
                  {copied ? "copied" : "copy"}
                </button>
              </div>
            </div>
            <div className="mt-5 space-y-2 text-lg leading-8 text-slate-400">
              {installSteps.map((item) => (
                <div key={item.number}>
                  <span className="mr-2 text-cyan-300">{item.number}</span>
                  <span>{item.body}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-cyan-400/30 bg-[rgba(4,16,24,0.76)] px-5 py-6 sm:px-6">
            <p className="text-3xl font-semibold text-cyan-300">{"// what you can do"}</p>
            <div className="mt-5 space-y-4 text-lg leading-8 text-slate-400">
              {userActions.map((item) => (
                <div key={item.title}>
                  <p className="text-cyan-300">{`> ${item.title}`}</p>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
