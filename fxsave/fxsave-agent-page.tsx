"use client";

import { useState } from "react";

import { FxsaveTopMenu } from "@/fxsave/fxsave-top-menu";

const skillPageUrl = "https://github.com/huwangtao123/fxsave-dapp/blob/main/fxsave/SKILL.md";
const skillRawUrl = "https://raw.githubusercontent.com/huwangtao123/fxsave-dapp/main/fxsave/SKILL.md";
const installLocation = "~/.codex/skills/fxsave/SKILL.md";
const installCommand = `mkdir -p ~/.codex/skills/fxsave && curl -s ${skillRawUrl} -o ${installLocation}`;

const installSteps = [
  {
    number: "1.",
    body: "Run the command above. It writes the fxSAVE skill file into your local Codex skills folder.",
  },
  {
    number: "2.",
    body: "Restart or reload your agent so it picks up the skill from that installed location.",
  },
  {
    number: "3.",
    body: "Use the skill to mint or redeem through the app backend, with approval only when needed.",
  },
];

const userActions = [
  {
    title: "Mint fxSAVE",
    body: "Deposit all my fxUSD in wallet to fxSAVE.",
  },
  {
    title: "Redeem fxSAVE",
    body: "Redeem 50% of my fxSAVE to fxUSD.",
  },
];

export function FxsaveAgentPage() {
  const [copied, setCopied] = useState(false);

  async function handleCopyInstall() {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#041018] font-mono text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(7,63,72,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(7,63,72,0.14)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,225,255,0.1),transparent_26%),linear-gradient(180deg,rgba(4,16,24,0.28),#041018_76%)]" />

      <main className="relative mx-auto max-w-5xl px-6 py-10 sm:px-8 lg:px-10">
        <FxsaveTopMenu active="agent" />

        <section className="mx-auto max-w-3xl text-center">
          <h1 className="mt-12 text-5xl font-semibold tracking-tight text-cyan-300 sm:text-6xl">Hey, Agent</h1>
          <p className="mt-6 text-xl leading-9 text-slate-300">
            Install a skill that can mint or redeem fxSAVE in one step.
          </p>
          <p className="text-xl leading-9 text-slate-300">
            No more manual bridging between Base and Ethereum mainnet.
          </p>
        </section>

        <div className="mx-auto mt-12 max-w-5xl space-y-6">
          <section className="border border-cyan-400/30 bg-[rgba(4,16,24,0.76)] px-5 py-6 sm:px-6">
            <p className="text-3xl font-semibold text-cyan-300">// install</p>
            <div className="mt-6 border border-cyan-400/25 bg-[#020b11] px-4 py-4 text-base text-cyan-100">
              <div className="flex items-center justify-between gap-4">
                <code className="overflow-x-auto whitespace-nowrap pr-2">$ {installCommand}</code>
                <button
                  className="shrink-0 text-sm text-slate-400 transition hover:text-cyan-200"
                  onClick={handleCopyInstall}
                  type="button"
                >
                  {copied ? "copied" : "copy"}
                </button>
              </div>
            </div>
            <p className="mt-4 break-all text-lg text-slate-400">
              Skill location: <span className="text-cyan-200">{skillPageUrl}</span>
            </p>
            <p className="mt-2 text-lg text-slate-400">
              Install destination: <span className="text-cyan-200">{installLocation}</span>
            </p>
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
            <p className="text-3xl font-semibold text-cyan-300">// what you can do</p>
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
