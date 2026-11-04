// Catálogo de GameKit (GET /api/lab/icons → Express /api/icons, generado con scripts/build-icons.mjs).
export type ResKey = "food" | "wood" | "gold" | "stone";
export type Cost = Partial<Record<ResKey, number>>;

export interface GkItem {
  n: string; // nombre canónico (inglés)
  k: "unit" | "tech" | "building"; // familia de pigmento
  i: string; // ruta del ícono dentro de /tree/ (img/Unit/2.png)
  ty: string; // tipo en el árbol: unit | upgrade | tech | building | defencive
  a: number; // edad 0-3
  es?: string;
  ef?: string; // efecto en español
  w?: string; // id del edificio donde se produce / investiga
  c?: Cost; // costo de producción o construcción
  rc?: Cost; // costo de investigación / mejora
  t?: number; rt?: number; bt?: number;
  st?: { hp?: number; atk?: number; arm?: [number, number]; rng?: number; spd?: number; rof?: number };
  sg?: string; wk?: string; bo?: Record<string, number>;
  pr?: string[]; // qué produce (edificios)
  av?: string[]; nv?: number; // disponibilidad por civ
}

export interface GkCivInfo {
  n: string; sp: string; tb: string; pos: "flank" | "pocket" | "flex";
  st: string[]; wk: string[]; ph?: string; uu?: string;
}

export interface GkCatalog {
  items: Record<string, GkItem>;
  names: Record<string, string>; // nombre en minúsculas → id
  civs: string[]; // slugs con emblema
  civInfo: Record<string, GkCivInfo>;
  ages: Record<string, string>; stats: Record<string, string>; res: Record<string, string>;
  totalCivs: number;
}

export const EMPTY_CATALOG: GkCatalog = { items: {}, names: {}, civs: [], civInfo: {}, ages: {}, stats: {}, res: {}, totalCivs: 56 };
