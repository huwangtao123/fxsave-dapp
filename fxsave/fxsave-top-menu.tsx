import Link from "next/link";

type FxsaveTopMenuProps = {
  active: "agent" | "home";
};

function itemClass(active: boolean) {
  return active
    ? "border-b border-cyan-300 text-cyan-200"
    : "border-b border-transparent text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200";
}

export function FxsaveTopMenu(props: FxsaveTopMenuProps) {
  return (
    <nav className="border border-cyan-400/25 bg-[rgba(4,16,24,0.76)] px-4 py-3 text-sm uppercase tracking-[0.24em] sm:px-5">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-5 text-xs sm:text-sm">
          <Link className={itemClass(props.active === "home")} href="/">
            App
          </Link>
          <Link className={itemClass(props.active === "agent")} href="/agent">
            Agent
          </Link>
        </div>
        <a
          className="border-b border-transparent text-xs text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200 sm:text-sm"
          href="https://github.com/huwangtao123/fxsave-dapp"
          rel="noreferrer"
          target="_blank"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}
