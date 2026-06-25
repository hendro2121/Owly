import { useState, useEffect } from "react";
import { logoSources } from "@/lib/logos";

/* Company avatar. Tries real logos in order (domain → ticker via Logo.dev), and
   falls back to a deterministic monogram tile if none load — so it always looks
   intentional. */

const PALETTE = ["#1F2937", "#0D4F4F", "#374151", "#1E3A8A", "#3F3F46", "#155E63", "#4B5563", "#312E81"];

function colorFor(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function CompanyLogo({ ticker, name, domain, size = 28, className = "" }) {
  const sources = logoSources(ticker, domain);
  const [idx, setIdx] = useState(0);

  // Reset to the first source whenever the company changes.
  useEffect(() => { setIdx(0); }, [ticker, domain]);

  const key = ticker || name || "?";
  const initials = (key.replace(/[^A-Za-z0-9]/g, "").slice(0, 2) || "?").toUpperCase();
  const src = sources[idx];

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-md overflow-hidden font-mono font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: src ? "#fff" : colorFor(key) }}
      aria-hidden="true"
    >
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          className="w-full h-full object-contain"
          onError={() => setIdx((i) => i + 1)}
          onLoad={(e) => {
            // Brandfetch serves a 1×1 transparent pixel when they have no logo —
            // treat that as a miss and advance to the next source / monogram.
            if (e.currentTarget.naturalWidth <= 4) setIdx((i) => i + 1);
          }}
        />
      ) : (
        initials
      )}
    </span>
  );
}
