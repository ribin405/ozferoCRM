export const STATUSES = ["new", "contacted", "interested", "not_interested", "converted"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not Interested",
  converted: "Converted",
};
export const STATUS_STYLE: Record<Status, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  interested: "bg-amber-100 text-amber-800",
  not_interested: "bg-rose-100 text-rose-700",
  converted: "bg-emerald-100 text-emerald-700",
};

export const SOURCES = ["visit", "phone", "whatsapp", "referral", "email", "event", "other"] as const;
export const ACTIVITY_TYPES = ["call", "whatsapp", "visit", "email", "meeting", "other"] as const;
export const EMIRATES = [
  "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah",
] as const;

export const label = (s: string) =>
  s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
