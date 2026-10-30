"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const ICON: Record<string, string> = {
  dashboard: "M3 12 12 4l9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  enquiries: "M4 5h16M4 12h16M4 19h10",
  followups: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  categories: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM17 13v7M13.5 16.5h7",
  team: "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
};

const NAV = [
  { href: "/", key: "dashboard", label: "Dashboard" },
  { href: "/enquiries", key: "enquiries", label: "Vendor Enquiries" },
  { href: "/follow-ups", key: "followups", label: "Follow-ups" },
  { href: "/categories", key: "categories", label: "Categories", admin: true },
  { href: "/team", key: "team", label: "Team", admin: true },
  { href: "/settings", key: "settings", label: "Settings" },
];

function toggleTheme() {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const next = dark ? "light" : "dark";
  r.dataset.theme = next;
  try {
    localStorage.setItem("ozf-theme", next);
  } catch {}
}

export default function Sidebar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <aside className="rail">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ozfero-icon.png" alt="Ozfero" />
        <div>
          <div className="word">Vendor Desk</div>
          <div className="sub">Offers team</div>
        </div>
      </div>
      <nav className="nav" aria-label="Main">
        {NAV.filter((n) => !n.admin || isAdmin).map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICON[n.key]} />
            </svg>
            {n.label}
            {n.admin && <span className="tag">Admin</span>}
          </Link>
        ))}
        <form action={signOut} className="only-mobile">
          <button type="submit">Sign out</button>
        </form>
      </nav>
      <div className="me">
        <div className="avatar">{initials || "U"}</div>
        <div className="min-w-0">
          <b className="block truncate">{name}</b>
          <small>{isAdmin ? "Administrator" : "Team member"}</small>
        </div>
        <div className="me-actions">
          <button type="button" onClick={toggleTheme} aria-label="Toggle light or dark theme">Theme</button>
          <form action={signOut}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
