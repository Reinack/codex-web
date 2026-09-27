// Catálogo de unidades para la grilla de selección manual del grafo de counters.
// Portado de web/public/index.html (QUICK_UNITS + UNIT_META) del backend original.
// `id` coincide con las líneas que devuelve /api/civ-units (para filtrar por civ).
// `uuName` (cuando aplica) = nombre de UU para casar con civ.uniqueUnits.

export type UnitKind = "generic" | "regional" | "unique";
export type BuildingKey =
  | "barracks"
  | "archery"
  | "stable"
  | "siege"
  | "dock"
  | "monastery"
  | "castle";

export type CatalogUnit = {
  id: string;
  label: string;
  imgKey: string;
  kind: UnitKind;
  building: BuildingKey;
  uuName?: string;
};

// Edificios en orden de despliegue, con su etiqueta.
export const BUILDINGS: { key: BuildingKey; label: string }[] = [
  { key: "barracks", label: "Cuartel" },
  { key: "archery", label: "Arquería" },
  { key: "stable", label: "Establo" },
  { key: "siege", label: "Asedio" },
  { key: "dock", label: "Muelle" },
  { key: "monastery", label: "Monasterio" },
  { key: "castle", label: "Castillo" },
];

export const KIND_LABEL: Record<UnitKind, string> = {
  generic: "genérica",
  regional: "regional",
  unique: "única",
};

export const UNIT_CATALOG: CatalogUnit[] = [
  // Arquería
  { id: "archer-line", label: "Archer", imgKey: "archer", kind: "generic", building: "archery" },
  { id: "skirmisher-line", label: "Skirm", imgKey: "skirmisher", kind: "generic", building: "archery" },
  { id: "hand-cannoneer", label: "HC", imgKey: "handcannon", kind: "generic", building: "archery" },
  { id: "cavalry-archer", label: "Cav Arch", imgKey: "cavarcher", kind: "generic", building: "archery" },
  { id: "mounted-crossbowman", label: "Mtd Xbow", imgKey: "heavy_mounted_crossbow", kind: "regional", building: "archery" },
  { id: "elephant-archer", label: "Ele Arch", imgKey: "elephant_archer", kind: "regional", building: "archery" },
  { id: "slinger", label: "Slinger", imgKey: "slinger", kind: "regional", building: "archery" },
  { id: "xianbei-raider", label: "Xianbei", imgKey: "xianbei_raider", kind: "unique", building: "archery", uuName: "Xianbei Raider" },
  // Cuartel
  { id: "militia-line", label: "Militia", imgKey: "champion", kind: "generic", building: "barracks" },
  { id: "varangian-guard", label: "Varangian", imgKey: "elite_varangian_guard", kind: "regional", building: "barracks" },
  { id: "spearman-line", label: "Halbs", imgKey: "halberdier", kind: "generic", building: "barracks" },
  { id: "eagle-warrior", label: "Eagle", imgKey: "eaglewarrior", kind: "regional", building: "barracks" },
  { id: "fire-lancer", label: "Fire Lanc", imgKey: "fire_lancer", kind: "regional", building: "barracks" },
  { id: "champi-line", label: "Champi", imgKey: "champiwarrior", kind: "regional", building: "barracks" },
  { id: "jian-swordsman", label: "Jian Sw", imgKey: "jian_swordsman", kind: "unique", building: "barracks", uuName: "Jian Swordsman" },
  // Establo
  { id: "scout-line", label: "Scout", imgKey: "hussar", kind: "generic", building: "stable" },
  { id: "knight-line", label: "Knight", imgKey: "paladin", kind: "generic", building: "stable" },
  { id: "camel-line", label: "Camel", imgKey: "camel", kind: "regional", building: "stable" },
  { id: "battle-elephant", label: "Bat Ele", imgKey: "battleeleph", kind: "regional", building: "stable" },
  { id: "steppe-lancer", label: "Steppe", imgKey: "steppe_lancer", kind: "regional", building: "stable" },
  { id: "hei-guang-cavalry", label: "Hei Guang", imgKey: "hei_guang", kind: "regional", building: "stable" },
  // Asedio
  { id: "ram-line", label: "Ram", imgKey: "siegeram", kind: "generic", building: "siege" },
  { id: "mangonel-line", label: "Mangonel", imgKey: "mangonel", kind: "generic", building: "siege" },
  { id: "scorpion-line", label: "Scorpion", imgKey: "scorpion", kind: "generic", building: "siege" },
  { id: "bombard-cannon", label: "BBC", imgKey: "bombcannon", kind: "generic", building: "siege" },
  { id: "siege-elephant", label: "Siege Ele", imgKey: "siege_elephant", kind: "regional", building: "siege" },
  { id: "rocket-cart", label: "Rocket", imgKey: "rocket_cart", kind: "regional", building: "siege" },
  // Monasterio
  { id: "monk", label: "Monk", imgKey: "monk", kind: "generic", building: "monastery" },
  // Muelle
  { id: "galley-line", label: "Galley", imgKey: "galley", kind: "generic", building: "dock" },
  { id: "fire-ship-line", label: "Fire Ship", imgKey: "fireship", kind: "generic", building: "dock" },
  { id: "demo-ship", label: "Demo Ship", imgKey: "demoship", kind: "generic", building: "dock" },
  { id: "hulk-line", label: "Hulk", imgKey: "hulk", kind: "generic", building: "dock" },
  { id: "cannon-galleon", label: "Cannon G.", imgKey: "cannongalleon", kind: "generic", building: "dock" },
  { id: "lou-chuan", label: "Lou Chuan", imgKey: "lou_chuan", kind: "regional", building: "dock" },
  { id: "dromon", label: "Dromon", imgKey: "dromon", kind: "regional", building: "dock" },
  { id: "catapult-galleon", label: "Catapult G.", imgKey: "catapult_gall", kind: "regional", building: "dock" },
  { id: "turtle-ship", label: "Turtle", imgKey: "turtle_ship", kind: "unique", building: "dock", uuName: "Turtle Ship" },
  { id: "caravel", label: "Caravel", imgKey: "caravel_d", kind: "unique", building: "dock", uuName: "Caravel" },
  // Ex Longboat vikingo: desde el Update 185872 es regional (Danes, Saxons, Varangians, Vikings).
  { id: "longship", label: "Longship", imgKey: "longship", kind: "regional", building: "dock" },
  { id: "thirisadai", label: "Thirisadai", imgKey: "thirisadai", kind: "unique", building: "dock", uuName: "Thirisadai" },
  { id: "dragon-ship", label: "Dragon Sh", imgKey: "dragon_ship", kind: "unique", building: "dock", uuName: "Dragon Ship" },
  // Castillo (UUs por imagen)
  { id: "liao-dao", label: "Liao Dao", imgKey: "liao_dao", kind: "unique", building: "castle", uuName: "Liao Dao" },
  { id: "white-feather-guard", label: "W.Feather", imgKey: "white_feather", kind: "unique", building: "castle", uuName: "White Feather Guard" },
];
