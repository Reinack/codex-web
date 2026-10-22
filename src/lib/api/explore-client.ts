// Fetchers del lado cliente: pegan a los route handlers BFF (same-origin) y
// validan con zod. Pensados para componentes cliente (búsqueda, grafo, matchups).
import {
  SearchResultsSchema,
  GraphSchema,
  NoteSchema,
  MatchupSchema,
  CivListOutSchema,
  RadarSchema,
  CatalogCountsSchema,
  CatalogItemsSchema,
  type CatalogCounts,
  type CatalogItem,
  type RadarData,
  type SearchResult,
  type GraphData,
  type NoteData,
  type Matchup,
  type CivListItem,
} from "./schema";

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}

export async function fetchSearch(q: string): Promise<SearchResult[]> {
  return SearchResultsSchema.parse(await getJson(`/api/search?q=${encodeURIComponent(q)}`));
}

export async function fetchGraph(path: string): Promise<GraphData> {
  return GraphSchema.parse(await getJson(`/api/graph?path=${encodeURIComponent(path)}`));
}

export async function fetchNote(path: string, content = false): Promise<NoteData> {
  const qs = `path=${encodeURIComponent(path)}${content ? "&content=1" : ""}`;
  return NoteSchema.parse(await getJson(`/api/note?${qs}`));
}

export async function fetchMatchup(me: string, vs: string, map: string): Promise<Matchup> {
  const qs = new URLSearchParams({ me, vs, map }).toString();
  return MatchupSchema.parse(await getJson(`/api/matchup?${qs}`));
}

export async function fetchCivsClient(): Promise<CivListItem[]> {
  return CivListOutSchema.parse(await getJson(`/api/civs`));
}

export async function fetchCivRadar(slug: string): Promise<RadarData | null> {
  const res = await fetch(`/api/civ-radar?slug=${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return RadarSchema.parse(await res.json());
}

export async function fetchCatalogCounts(): Promise<CatalogCounts> {
  return CatalogCountsSchema.parse(await getJson(`/api/catalog`));
}

export async function fetchCatalog(type: string): Promise<CatalogItem[]> {
  return CatalogItemsSchema.parse(await getJson(`/api/catalog?type=${encodeURIComponent(type)}`));
}
