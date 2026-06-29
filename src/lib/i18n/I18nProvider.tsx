"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DICTIONARIES, LOCALES, type Locale } from "./dictionaries";

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = "codex-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // SSR y primer render usan 'es' para no romper la hidratación; el idioma
  // guardado se aplica en useEffect tras montar.
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LOCALES as string[]).includes(saved)) setLocaleState(saved as Locale);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* localStorage no disponible: el idioma vive solo en memoria */
    }
  };

  const t = (key: string) => DICTIONARIES[locale][key] ?? DICTIONARIES.es[key] ?? key;

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}

// Atajo: hook que devuelve solo la función de traducción.
export function useT(): (key: string) => string {
  return useI18n().t;
}
