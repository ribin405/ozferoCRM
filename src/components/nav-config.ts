export const ICON: Record<string, string> = {
  dashboard: "M3 12 12 4l9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  enquiries: "M4 5h16M4 12h16M4 19h10",
  followups: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  categories: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM17 13v7M13.5 16.5h7",
  team: "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  filter: "M4 6h16M7 12h10M10 18h4",
  plus: "M12 5v14M5 12h14",
  moon: "M21 13a8 8 0 1 1-10-10 6.5 6.5 0 0 0 10 10z",
  out: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
};

export const NAV = [
  { href: "/", key: "dashboard", label: "Dashboard" },
  { href: "/enquiries", key: "enquiries", label: "Vendor Enquiries" },
  { href: "/follow-ups", key: "followups", label: "Follow-ups" },
  { href: "/categories", key: "categories", label: "Categories", admin: true },
  { href: "/team", key: "team", label: "Team", admin: true },
  { href: "/settings", key: "settings", label: "Settings" },
];

export function toggleTheme() {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const next = dark ? "light" : "dark";
  r.dataset.theme = next;
  try {
    localStorage.setItem("ozf-theme", next);
  } catch {}
}
