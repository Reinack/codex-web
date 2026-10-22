"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { DICTIONARIES, LOCALES, type Locale } from "./dictionaries";

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = "codex-locale";

// El idioma vive en localStorage (store externo). useSyncExternalStore lo lee sin
// setState dentro de un efecto: SSR e hidratación usan 'es' (getServerSnapshot) y
// el cliente pasa al idioma guardado apenas monta.
const listeners = new Set<() => void>();
let memoryLocale: Locale | null = null; // respaldo si localStorage no está disponible

function isLocale(v: string | null): v is Locale {
  return !!v && (LOCALES as string[]).includes(v);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb); // cambios desde otra pestaña
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* localStorage no disponible */
  }
  return memoryLocale ?? "es";
}

const getServerSnapshot = (): Locale => "es";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = (l: Locale) => {
    memoryLocale = l;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* localStorage no disponible: el idioma vive solo en memoria */
    }
    listeners.forEach((cb) => cb());
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
