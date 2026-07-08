import { TAG_LABELS, type Tag } from "@/lib/types";

export function TagBadge({ tag }: { tag: Tag | null }) {
  if (!tag) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-accent-soft text-accent px-2 py-0.5 text-[11px] font-medium">
      {TAG_LABELS[tag]}
    </span>
  );
}

export function ClosenessDots({ value }: { value: number | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-0.5" title={`Closeness ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= value ? "bg-accent" : "bg-border"}`}
        />
      ))}
    </span>
  );
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
