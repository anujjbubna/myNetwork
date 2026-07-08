"use client";

import Link from "next/link";
import { Avatar } from "./Avatar";
import { TagBadge, ClosenessDots, timeAgo } from "./badges";
import type { PersonCardData } from "@/lib/types";

/** Card used in dashboard carousels. */
export function CarouselPersonCard({
  person,
  footer,
  onSnooze,
}: {
  person: PersonCardData;
  footer?: string;
  onSnooze?: () => void;
}) {
  return (
    <div className="snap-start shrink-0 w-40 rounded-2xl border border-border bg-surface p-3 flex flex-col gap-2">
      <Link href={`/people/${person.id}`} className="flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between">
          <Avatar name={person.fullName} />
          <ClosenessDots value={person.closeness} />
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight">{person.fullName}</div>
          {person.whatTheyDo && (
            <div className="text-xs text-muted line-clamp-1 mt-0.5">{person.whatTheyDo}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <TagBadge tag={person.tag} />
          {footer && <span className="text-[11px] text-muted">{footer}</span>}
        </div>
      </Link>
      {onSnooze && (
        <button
          onClick={onSnooze}
          className="text-xs font-medium text-muted border border-border rounded-lg py-1.5 hover:bg-surface-2 active:scale-95 transition"
        >
          Snooze 2w
        </button>
      )}
    </div>
  );
}

/** Compact card rendered inline in chat replies. */
export function ChatPersonCard({ person }: { person: PersonCardData }) {
  return (
    <Link
      href={`/people/${person.id}`}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 hover:bg-surface-2 transition"
    >
      <Avatar name={person.fullName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{person.fullName}</div>
        <div className="text-[11px] text-muted truncate">
          {[person.whatTheyDo, `last ${timeAgo(person.lastInteractedAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <ClosenessDots value={person.closeness} />
    </Link>
  );
}
