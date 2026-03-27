import { ReactNode } from "react";

export function MetricCard(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border border-cyan-400/25 bg-[rgba(4,16,24,0.76)] px-4 py-4 text-sm text-slate-300">
      <div className="mb-3 flex size-9 items-center justify-center bg-cyan-300/10 text-cyan-200">
        {props.icon}
      </div>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{props.value}</p>
    </div>
  );
}
