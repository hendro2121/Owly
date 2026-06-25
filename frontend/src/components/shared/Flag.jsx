/* Flat, rectangular flag (self-hosted SVG in /public/flags) — no emoji. */
export function Flag({ code, size = 18, className = "" }) {
  if (!code) return null;
  return (
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: Math.round(size * 0.75) }}
    />
  );
}
