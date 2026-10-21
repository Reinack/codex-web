"use client";

// Piezas chicas compartidas por el planificador de producción.
import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Res } from "@/lib/production/engine";

/** Colores de recurso sobre pergamino (pigmentos, no los rojos de acción). */
export const RES_COLOR: Record<Res, string> = {
  food: "#5a8330", wood: "#83551d", gold: "#c69b45", stone: "#7b8087",
};

// Íconos same-origin vía el proxy /api/icon (unidades/edificios y recursos del árbol).
const iconUrl = (imgPath?: string | null) => (imgPath ? `/api/icon?p=${encodeURIComponent(imgPath)}` : "");

/** Reemplaza los {marcadores} de un texto del diccionario. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/** Nombre de una fuente de recursos en el idioma de la interfaz (el backend solo la manda en español). */
export function useSourceLabel() {
  const { t } = useI18n();
  return (id: string, fallback: string) => {
    const key = `production.source.${id}`;
    const v = t(key);
    return v === key ? fallback : v;
  };
}

/** Formato numérico según el idioma de la interfaz. */
export function useNumberFormat() {
  const { locale } = useI18n();
  const tag = locale === "es" ? "es-UY" : "en-US";
  return (v: number, digits = 0) =>
    new Intl.NumberFormat(tag, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
}

export function ResIcon({ res, className = "inline-block h-4 w-4" }: { res: Res; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/icon?p=img/${res}.png`} alt="" aria-hidden className={`${className} object-contain`} />;
}

export function ItemIcon({
  name, imgPath, className = "h-8 w-8",
}: { name: string; imgPath?: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = iconUrl(imgPath);
  // Sin ícono (p. ej. la Casa) o si la imagen falla: ficha con las iniciales.
  if (!src || broken) {
    const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return (
      <span
        role="img"
        aria-label={name}
        className={`${className} flex shrink-0 items-center justify-center bg-[#2a1a0e] font-display text-[10px] font-bold text-[var(--gold)] ring-1 ring-[var(--gold)]/40`}
      >
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className={`${className} shrink-0 object-contain`} onError={() => setBroken(true)} />
  );
}

export function Stepper({
  value, onChange, min = 1, max = 99, minusLabel, plusLabel,
}: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; minusLabel: string; plusLabel: string;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center border border-[var(--rule)] bg-[rgba(255,248,228,0.5)] text-lg leading-none transition-colors hover:border-[var(--red-500)] hover:text-[var(--red-500)] disabled:opacity-40 disabled:hover:border-[var(--rule)] disabled:hover:text-inherit sm:h-8 sm:w-8";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={minusLabel}>−</button>
      <span className="min-w-6 text-center text-base font-bold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={plusLabel}>+</button>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value, options, onChange, label,
}: {
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex border border-[var(--rule)]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`min-w-11 px-2.5 py-1.5 text-sm font-semibold tabular-nums transition-colors sm:py-1 ${
              on
                ? "bg-[var(--red-500)] text-[var(--btn-text)]"
                : "bg-[rgba(255,248,228,0.35)] hover:bg-[rgba(138,24,18,0.12)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const smallBtn =
  "inline-flex h-8 w-8 items-center justify-center border border-transparent text-zinc-500 transition-colors hover:border-[var(--rule)] hover:text-[var(--red-500)] disabled:opacity-30 disabled:hover:border-transparent disabled:hover:text-zinc-500";
