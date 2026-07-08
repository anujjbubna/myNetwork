export type Tag = "FAMILY" | "FRIEND" | "ACQUAINTANCE" | "BUSINESS";

export const TAG_LABELS: Record<Tag, string> = {
  FAMILY: "Family",
  FRIEND: "Friend",
  ACQUAINTANCE: "Acquaintance",
  BUSINESS: "Business",
};

export interface PersonCardData {
  id: string;
  fullName: string;
  tag: Tag | null;
  closeness: number | null;
  whatTheyDo: string | null;
  lastInteractedAt: string | null;
  interactionCount?: number;
}

export interface PersonFull extends PersonCardData {
  howWeMet: string | null;
  location: string | null;
  birthday: string | null;
  links: string[];
  likes: string[];
  dislikes: string[];
  highlights: string[];
  relationshipSummary: string | null;
  snoozedUntil: string | null;
  knows: { id: string; fullName: string }[];
  interactions: InteractionData[];
  createdAt: string;
}

export interface InteractionData {
  id: string;
  date: string;
  summary: string;
  rawText: string;
  people: { id: string; fullName: string }[];
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  people: PersonCardData[];
  createdAt: string;
}

export interface NudgeData {
  id: string;
  text: string;
  personId: string | null;
  personName: string | null;
}

export interface DashboardData {
  topPeople: PersonCardData[];
  reconnectPeople: PersonCardData[];
  nudges: NudgeData[];
  totalPeople: number;
}
