// Diccionario de UI ("chrome") ES/EN. Solo strings estáticos: el contenido
// dinámico (consejos, prosa del grafo) sigue generándose en español por ahora.
import { PRODUCTION_EN, PRODUCTION_ES } from "./production-dict";

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
    ...PRODUCTION_ES,

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
    "counters.viewList": "Lista",
    "counters.viewGraph": "Grafo",
    "counters.countersYou": "La counterean",
    "counters.youBeat": "Le gana a",
    "counters.why": "Por qué",
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
    "graph.catalog": "Catálogo del grafo",
    "graph.catalogIntro": "Elegí una categoría y una nota para centrar el grafo en ella.",
    "graph.filter": "Filtrar…",
    "graph.sortAlpha": "A–Z",
    "graph.sortDegree": "Más conectadas",
    "graph.links": "enlaces",
    "graph.backToCatalog": "← Catálogo",
    "graph.article": "Artículo",
    "graph.detail": "Detalle",
    "graph.graph": "Grafo",
    "graph.connections": "Conexiones",
    "graph.catalogError": "No se pudo cargar el catálogo (¿el backend ya tiene /api/catalog?).",
    "cat.units": "Unidades",
    "cat.technologies": "Tecnologías",
    "cat.buildings": "Edificios",
    "cat.civs": "Civilizaciones",
    "cat.strategies": "Estrategias",
    "cat.maps": "Mapas",
    "cat.matchups": "Matchups",
    "cat.meta": "Meta",
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
    ...PRODUCTION_EN,

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
    "counters.viewList": "List",
    "counters.viewGraph": "Graph",
    "counters.countersYou": "Countered by",
    "counters.youBeat": "Beats",
    "counters.why": "Why",
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
    "graph.catalog": "Graph catalog",
    "graph.catalogIntro": "Pick a category and a note to center the graph on it.",
    "graph.filter": "Filter…",
    "graph.sortAlpha": "A–Z",
    "graph.sortDegree": "Most connected",
    "graph.links": "links",
    "graph.backToCatalog": "← Catalog",
    "graph.article": "Article",
    "graph.detail": "Details",
    "graph.graph": "Graph",
    "graph.connections": "Connections",
    "graph.catalogError": "Couldn't load the catalog (does the backend have /api/catalog yet?).",
    "cat.units": "Units",
    "cat.technologies": "Technologies",
    "cat.buildings": "Buildings",
    "cat.civs": "Civilizations",
    "cat.strategies": "Strategies",
    "cat.maps": "Maps",
    "cat.matchups": "Matchups",
    "cat.meta": "Meta",
  },
};
