export function OwlyLogo({ size = 32, color = "#FF5C00" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <polygon points="20,85 50,15 58,15 88,55 72,55 62,70 50,55 38,72 30,60" fill={color} />
      <circle cx="54" cy="32" r="3.5" fill="#0A0A0A" />
    </svg>
  );
}
