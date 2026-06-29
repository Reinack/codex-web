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
    "header.searchPlaceholder": "Buscar (ES/EN): Hostigador, Aztecas, Blo…",

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
    "header.searchPlaceholder": "Search (ES/EN): Skirmisher, Aztecs, Blo…",

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
