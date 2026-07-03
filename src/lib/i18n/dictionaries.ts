// Diccionario de UI ("chrome") ES/EN. Solo strings estáticos: el contenido
// dinámico (consejos, prosa del grafo) sigue generándose en español por ahora.
export type Locale = "es" | "en";

export const LOCALES: Locale[] = ["es", "en"];

type Dict = Record<string, string>;

export const DICTIONARIES: Record<Locale, Dict> = {
  es: {
    "nav.civs": "Civs",
    "nav.tree": "Árbol",
    "nav.counters": "Counters",
    "nav.matchups": "Matchups",
    "nav.graph": "Grafo",
    "nav.chat": "Chat",
    "nav.production": "Producción",
    "header.searchPlaceholder": "Buscar (ES/EN): Hostigador, Aztecas, Blo…",

    "production.title": "Calculadora de producción",
    "production.subtitle":
      "Cuántos aldeanos (y de qué recurso) necesitás para sostener la producción de tus unidades y edificios. Cada línea = un edificio produciendo sin parar.",
    "production.reset": "Limpiar",
    "production.demand": "Producción a sostener",
    "production.add": "Agregar unidad o edificio…",
    "production.addBtn": "Agregar",
    "production.emptyItems": "Agregá unidades o edificios para calcular.",
    "production.result": "Aldeanos necesarios",
    "production.emptyResult": "Elegí qué producir para calcular.",
    "production.total": "Total",
    "production.villagers": "aldeanos",
    "production.bottleneck": "cuello de botella",
    "production.economy": "Economía — fuentes, tecnologías e ingreso pasivo",
    "production.standardEco": "Por defecto: economía estándar de la edad",
    "production.techsTitle": "Tecnologías de recolección",
    "production.relics": "Reliquias",
    "production.trade": "Trade carts",
    "production.feitoria": "Feitorias",
    "production.appliedBonuses": "Bonos aplicados",
    "production.res.food": "Comida",
    "production.res.wood": "Madera",
    "production.res.gold": "Oro",
    "production.res.stone": "Piedra",
    "production.source.standard": "(estándar de la edad)",

    "common.search": "Buscar",
    "common.loading": "cargando…",
    "common.analyze": "Analizar",

    // Matchups
    "matchups.eyebrow": "Matchup Lab",
    "matchups.title": "Cruzá dos civilizaciones",
    "matchups.subtitle":
      "Plan de juego, fortalezas y debilidades por radar, counters a favor y en contra, y las notas del grafo que mencionan a ambas.",
    "matchups.yourCiv": "Tu civilización",
    "matchups.rival": "Rival",
    "matchups.mapOptional": "Mapa (opcional)",
    "matchups.choose": "Elegí…",
    "matchups.distinct": "Elegí dos civilizaciones distintas.",
    "matchups.analyzing": "Analizando el matchup…",

    // Counters
    "counters.title": "Grafo de counters",
    "counters.subtitle":
      "Elegí una unidad de la grilla o buscala: el centro es la unidad, alrededor lo que la counterea y a lo que ella le gana. Agregá civilizaciones para filtrar por lo que pueden construir.",
    "counters.addCiv": "+ Agregar civilización…",
    "counters.searchPlaceholder": "o buscá: knight, mangonel, jaguar…",
    "counters.clickNode": "Clickeá un nodo para ver el detalle.",
    "counters.uuOfYourCivs": "Unidades únicas de tus civs",

    // Graph
    "graph.title": "Explorador del grafo",
    "graph.pickCiv": "Elegí una civilización para empezar a explorar el grafo de conocimiento.",
    "graph.explore": "Explorar",
    "graph.viewCard": "Ver ficha",
    "graph.clickNode": "Clickeá un nodo para ver el detalle.",
    "graph.noConnections": "Sin conexiones en el grafo.",
  },
  en: {
    "nav.civs": "Civs",
    "nav.tree": "Tech Tree",
    "nav.counters": "Counters",
    "nav.matchups": "Matchups",
    "nav.graph": "Graph",
    "nav.chat": "Chat",
    "nav.production": "Production",
    "header.searchPlaceholder": "Search (ES/EN): Skirmisher, Aztecs, Blo…",

    "production.title": "Production calculator",
    "production.subtitle":
      "How many villagers (and on which resource) you need to sustain production of your units and buildings. Each line = one building producing non-stop.",
    "production.reset": "Clear",
    "production.demand": "Production to sustain",
    "production.add": "Add unit or building…",
    "production.addBtn": "Add",
    "production.emptyItems": "Add units or buildings to calculate.",
    "production.result": "Villagers needed",
    "production.emptyResult": "Pick what to produce to calculate.",
    "production.total": "Total",
    "production.villagers": "villagers",
    "production.bottleneck": "bottleneck",
    "production.economy": "Economy — sources, technologies and passive income",
    "production.standardEco": "Default: standard economy for the age",
    "production.techsTitle": "Gathering technologies",
    "production.relics": "Relics",
    "production.trade": "Trade carts",
    "production.feitoria": "Feitorias",
    "production.appliedBonuses": "Applied bonuses",
    "production.res.food": "Food",
    "production.res.wood": "Wood",
    "production.res.gold": "Gold",
    "production.res.stone": "Stone",
    "production.source.standard": "(standard for the age)",

    "common.search": "Search",
    "common.loading": "loading…",
    "common.analyze": "Analyze",

    "matchups.eyebrow": "Matchup Lab",
    "matchups.title": "Cross two civilizations",
    "matchups.subtitle":
      "Game plan, radar strengths and weaknesses, counters for and against, and the graph notes that mention both.",
    "matchups.yourCiv": "Your civilization",
    "matchups.rival": "Opponent",
    "matchups.mapOptional": "Map (optional)",
    "matchups.choose": "Choose…",
    "matchups.distinct": "Pick two different civilizations.",
    "matchups.analyzing": "Analyzing the matchup…",

    "counters.title": "Counters graph",
    "counters.subtitle":
      "Pick a unit from the grid or search it: the center is the unit, around it what counters it and what it beats. Add civilizations to filter by what they can build.",
    "counters.addCiv": "+ Add civilization…",
    "counters.searchPlaceholder": "or search: knight, mangonel, jaguar…",
    "counters.clickNode": "Click a node to see details.",
    "counters.uuOfYourCivs": "Unique units of your civs",

    "graph.title": "Graph explorer",
    "graph.pickCiv": "Pick a civilization to start exploring the knowledge graph.",
    "graph.explore": "Explore",
    "graph.viewCard": "View page",
    "graph.clickNode": "Click a node to see details.",
    "graph.noConnections": "No connections in the graph.",
  },
};
