"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import Icon from "@/components/Icon";
import MobileNav from "@/components/MobileNav";
import { NAV, toggleTheme } from "@/components/nav-config";

export default function Sidebar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <>
      {/* Desktop (lg and up): gradient sidebar. */}
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
              <Icon name={n.key} />
              {n.label}
              {n.admin && <span className="tag">Admin</span>}
            </Link>
          ))}
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

      {/* Phone and tablet: top bar, bottom tab bar, More sheet. */}
      <MobileNav isAdmin={isAdmin} />
    </>
  );
}
