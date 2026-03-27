export function TextInput(props: {
  label: string;
  placeholder: string;
  readOnly?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{props.label}</span>
      <input
        className="h-12 w-full border border-cyan-400/25 bg-[#020b11] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-cyan-300/40 focus:border-cyan-300/40 focus-visible:ring-2 focus-visible:ring-cyan-300/60 read-only:cursor-not-allowed read-only:opacity-80"
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        readOnly={props.readOnly}
        value={props.value}
      />
    </label>
  );
}

export function OutputBlock(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{props.label}</p>
      <p className="mt-2 break-all font-mono text-sm text-slate-200">{props.value}</p>
    </div>
  );
}

export function CodeBlock(props: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">{props.label}</p>
      <pre className="max-h-72 overflow-auto rounded-2xl border border-white/6 bg-[#02070a] p-4 text-xs leading-6 text-slate-200">
        <code>{props.value}</code>
      </pre>
    </div>
  );
}
