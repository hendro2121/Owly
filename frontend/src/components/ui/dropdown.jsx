import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

/* A custom select rendered *inside the page* (not an OS-native popup), so it can
   carry flags, logos and rich rows — and be styled to match the app. */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchable = false,
  renderTrigger,
  renderOption,
  emptyText = "No results",
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) || null;
  const filtered = searchable && q
    ? options.filter((o) => (o.search || o.label || "").toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full h-10 flex items-center justify-between gap-2 rounded-lg border border-grey-200 bg-white pl-3 pr-2.5 text-sm font-medium text-grey-900 cursor-pointer transition-colors hover:border-grey-300 focus:outline-none focus:ring-2 focus:ring-lime-400"
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selected ? renderTrigger(selected) : <span className="text-grey-400">{placeholder}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-grey-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 rounded-xl border border-grey-200 bg-white shadow-elevated overflow-hidden animate-fade-in">
          {searchable && (
            <div className="p-2 border-b border-grey-100">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full h-8 rounded-lg border border-grey-200 px-2.5 text-sm text-grey-900 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-grey-400">{emptyText}</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-grey-50 ${o.value === value ? "bg-lime-50" : ""}`}
                >
                  <span className="flex items-center gap-2.5 min-w-0 flex-1">{renderOption(o)}</span>
                  {o.value === value && <Check className="h-4 w-4 text-grey-900 shrink-0" strokeWidth={2.5} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
