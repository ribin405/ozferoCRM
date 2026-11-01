"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/login/actions";
import Icon from "@/components/Icon";
import { NAV, toggleTheme } from "@/components/nav-config";

const TABS = [
  { href: "/", key: "dashboard", label: "Dashboard" },
  { href: "/enquiries", key: "enquiries", label: "Enquiries" },
  null,
  { href: "/follow-ups", key: "followups", label: "Follow-ups" },
];

/** Phone and tablet navigation: top bar, bottom tab bar and a "More" sheet. Hidden from lg up. */
export default function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const title = NAV.find((n) => active(n.href))?.label ?? (path.startsWith("/enquiries/new") ? "Add enquiry" : "Vendor Desk");
  const moreActive = ["/categories", "/team", "/settings"].some(active);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  return (
    <>
      <header className="mtop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Ozfero" className="h-10 w-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" />
        <b>{title}</b>
      </header>

      <nav className="mtabs" aria-label="Main">
        {TABS.map((t) =>
          t ? (
            <Link key={t.href} href={t.href} className="mtab" aria-current={active(t.href) && !path.startsWith("/enquiries/new") ? "page" : undefined}>
              <Icon name={t.key} className="h-5 w-5" />
              {t.label}
            </Link>
          ) : (
            <div key="fab">
              <Link href="/enquiries/new" className="mfab" aria-label="Add enquiry">
                <Icon name="plus" className="h-6 w-6" />
              </Link>
            </div>
          ),
        )}
        <button type="button" className="mtab" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-current={moreActive ? "page" : undefined}>
          <Icon name="more" className="h-5 w-5" />
          More
        </button>
      </nav>

      <div className="mscrim" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="msheet" data-open={open} role="dialog" aria-label="More" aria-hidden={!open} inert={!open}>
        <h2>More</h2>
        {isAdmin && (
          <>
            <Link href="/categories" className="mrow">
              <Icon name="categories" className="h-5 w-5" /> Categories <span className="tag">Admin</span>
            </Link>
            <Link href="/team" className="mrow">
              <Icon name="team" className="h-5 w-5" /> Team <span className="tag">Admin</span>
            </Link>
          </>
        )}
        <Link href="/settings" className="mrow">
          <Icon name="settings" className="h-5 w-5" /> Settings
        </Link>
        <button type="button" className="mrow" onClick={toggleTheme}>
          <Icon name="moon" className="h-5 w-5" /> Dark mode
        </button>
        <form action={signOut}>
          <button type="submit" className="mrow danger">
            <Icon name="out" className="h-5 w-5" /> Sign out
          </button>
        </form>
      </div>
    </>
  );
}
