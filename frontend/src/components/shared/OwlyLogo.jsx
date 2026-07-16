/* The Owly mark — the same asset the marketing landing uses (extracted from it),
   so the app and the landing carry an identical logo.

   `color` is still accepted because call sites pass it, but the mark is a
   fixed-colour image, so it has no effect. */
export function OwlyLogo({ size = 32, className = "" }) {
  return (
    <img
      src="/owly-logo.png"
      alt="Owly"
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
    />
  );
}
