export const curSymbol = (c) => ({ GBP: "£", USD: "$", EUR: "€", ZAR: "R" }[c] || "R");

export const isAcquisition = (t) => ["Buy", "Vesting", "OptionsExercise"].includes(t);

export const isNonDiscretionary = (t) =>
  ["Vesting", "TaxSale", "OptionsExercise", "HedgeSettlement", "Conversion", "Transfer"].includes(t);

export const dealColor = (t) =>
  isNonDiscretionary(t) ? "text-grey-500" : isAcquisition(t) ? "text-buy" : "text-sell";

export const dealColorHex = (t) =>
  isNonDiscretionary(t) ? "#737373" : isAcquisition(t) ? "#0A0A0A" : "#DC2626";

export const fmtCur = (v, market, currency) => {
  const p = currency ? curSymbol(currency) : "R";
  if (!v) return p + "0";
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return sign + p + (a / 1e9).toFixed(1) + "bn";
  if (a >= 1e6) return sign + p + (a / 1e6).toFixed(1) + "m";
  if (a >= 1e3) return sign + p + (a / 1e3).toFixed(0) + "k";
  return sign + p + Math.round(a);
};

export const fmt = {
  zar: (v) => fmtCur(v, "JSE"),
  num: (n) => (n || 0).toLocaleString("en-ZA"),
  d: (d) =>
    d
      ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })
      : "",
  full: (d) =>
    d
      ? new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
      : "",
};

/* SENS announcements often SHOUT names ("SANTOVA LIMITED"). Normalise all-caps
   strings to title case, keeping short acronyms (MTN, GP, PLC) as they are. */
export const titleIfShouty = (s) => {
  if (!s || s !== s.toUpperCase() || !/[A-Z]/.test(s)) return s;
  return s
    .split(/\s+/)
    .map((w) => (w.replace(/[^A-Z]/g, "").length <= 3 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
};

export const typeLabel = (type) => {
  const map = {
    HedgeSettlement: "Hedge",
    OptionsExercise: "Options",
    TaxSale: "Tax Sale",
  };
  return map[type] || type;
};

export const periodToDays = (p) => {
  if (p === "1W") return 7;
  if (p === "1M") return 30;
  if (p === "3M") return 90;
  if (p === "6M") return 180;
  if (p === "1Y") return 365;
  if (p === "YTD") {
    const n = new Date();
    return Math.ceil((n - new Date(n.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)) || 1;
  }
  return 365;
};
