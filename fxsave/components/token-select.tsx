import { ChevronDown } from "lucide-react";

import { FXSAVE_CONFIG } from "@/fxsave/config";

const SHOW_DEBUG_DETAILS = process.env.NODE_ENV !== "production";

export function TokenSelect(props: { onChange: (value: string) => void; value: string }) {
  return (
    <div className="relative">
      <select
        className="h-14 w-full appearance-none border border-cyan-400/25 bg-[#020b11] px-4 pr-10 text-base text-white outline-none transition hover:border-cyan-300/40 focus:border-cyan-300/40 focus-visible:ring-2 focus-visible:ring-cyan-300/60"
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      >
        {FXSAVE_CONFIG.baseTokenOptions.map((token) => (
          <option key={token.symbol} value={token.symbol}>
            {token.label}
          </option>
        ))}
        {SHOW_DEBUG_DETAILS ? <option value="custom">Custom token</option> : null}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function StaticField(props: { value: string }) {
  return (
    <div className="flex h-14 items-center border border-cyan-400/25 bg-[#020b11] px-4 text-base text-white">
      {props.value}
    </div>
  );
}
