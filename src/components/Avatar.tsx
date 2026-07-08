const HUES = [18, 42, 95, 150, 200, 255, 300, 340];

function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return HUES[h % HUES.length];
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const hue = hueFor(name);
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-16 h-16 text-xl",
  };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}
      style={{
        background: `oklch(0.85 0.08 ${hue})`,
        color: `oklch(0.35 0.1 ${hue})`,
      }}
    >
      {initials || "?"}
    </div>
  );
}
