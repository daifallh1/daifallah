"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { arTitle } from "./Ui";
import type { UiKey } from "@itil5/core";

const links: [string, string, UiKey][] = [
  ["/", "Home", "nav.home"],
  ["/exam/", "Exam", "nav.exam"],
  ["/study/", "Study", "nav.study"],
  ["/review/", "Review", "nav.review"],
  ["/mistakes/", "Mistakes", "nav.mistakes"],
  ["/progress/", "Progress", "nav.progress"],
  ["/audit/", "Audit", "nav.audit"],
];

export function Nav() {
  const path = usePathname();
  const [theme, setTheme] = useState<string>("system");
  useEffect(() => {
    try { setTheme(localStorage.getItem("theme") ?? "system"); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return (
    <header className="topbar">
      <Link href="/" className="brand">ITIL<sup>®</sup> Foundation v5 <span>Practice</span></Link>
      <nav aria-label="Main">
        <ul>
          {links.map(([href, label, k]) => (
            <li key={href}>
              <Link href={href} title={arTitle(k)} aria-current={path === href ? "page" : undefined}>{label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <label className="theme">
        <span className="sr-only">Theme</span>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Theme">
          <option value="system">Auto</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </header>
  );
}
