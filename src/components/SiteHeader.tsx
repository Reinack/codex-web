"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearch } from "./GlobalSearch";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES } from "@/lib/i18n/dictionaries";

const NAV = [
  { href: "/civs", key: "nav.civs" },
  { href: "/tree", key: "nav.tree" },
  { href: "/counters", key: "nav.counters" },
  { href: "/matchups", key: "nav.matchups" },
  { href: "/production", key: "nav.production" },
  { href: "/graph", key: "nav.graph" },
  { href: "/chat", key: "nav.chat" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  return (
    <header className="on-dark sticky top-0 z-20 border-b border-[var(--gold-line)] bg-[#24140b] bg-[image:var(--wood)] bg-fixed shadow-[0_1px_0_0_#0b0603,0_6px_18px_rgba(0,0,0,0.45)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-[15px] font-bold tracking-[0.06em] text-[var(--on-dark)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--gold)]" fill="none" aria-hidden>
            <path d="M6.5 7 12 17M17.5 7 12 17M7.2 6h9.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="6.5" cy="7" r="2.2" fill="currentColor" opacity="0.6" />
            <circle cx="17.5" cy="7" r="2.2" fill="currentColor" opacity="0.6" />
            <circle cx="12" cy="17" r="2.6" fill="currentColor" />
          </svg>
          AoE2 · <span className="text-[var(--gold-text)]">Codex</span>
        </Link>
        <nav className="order-3 flex flex-wrap gap-0.5 font-display text-[13px] font-semibold tracking-[0.04em] sm:order-2">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-2.5 py-1.5 transition-colors ${
                  active
                    ? "text-[var(--gold-text)]"
                    : "text-[var(--on-dark-dim)] hover:bg-[rgba(138,24,18,0.35)] hover:text-[var(--on-dark)]"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-px bg-[var(--gold)]" />
                )}
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
          <GlobalSearch />
          <div className="flex shrink-0 overflow-hidden border border-[var(--hair)] font-display text-[11px] font-bold">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                aria-pressed={locale === l}
                className={`px-1.5 py-1 uppercase transition-colors ${
                  locale === l
                    ? "text-[var(--gold-text)] shadow-[inset_0_0_0_1px_var(--gold)]"
                    : "text-[var(--on-dark-dim)] hover:bg-[rgba(138,24,18,0.35)] hover:text-[var(--on-dark)]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
