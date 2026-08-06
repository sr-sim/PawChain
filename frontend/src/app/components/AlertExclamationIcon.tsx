export function AlertExclamationIcon({ className = "h-7 w-7", tone = "alert" }: { className?: string; tone?: "alert" | "info" }) {
  const mainColor = tone === "info" ? "#2563eb" : "#f51621";
  const borderColor = tone === "info" ? "#1d4ed8" : "#d90d16";
  const shadowColor = tone === "info" ? "#1742a0" : "#a60810";

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill={mainColor} stroke={borderColor} strokeWidth="0.8" />
      <path d="m17.5 6.1 12.7 12.7A14.55 14.55 0 0 1 19 30.2L13.9 25l2.2-2.1-1.4-1.4 2.8-15.4Z" fill={shadowColor} opacity="0.62" />
      <path fill="white" d="M14.35 6.2a1.66 1.66 0 0 1 3.3 0l-.8 13.25a.85.85 0 0 1-1.7 0L14.35 6.2ZM16 25.9a2.05 2.05 0 1 0 0-4.1 2.05 2.05 0 0 0 0 4.1Z" />
    </svg>
  );
}
