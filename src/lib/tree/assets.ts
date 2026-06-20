import { IMG_MAP } from "./img-map";

// El asset host (Render) no manda CORS, y Cytoscape dibuja imágenes en canvas con
// crossorigin=anonymous → fallarían. Por eso devolvemos una URL same-origin que
// pasa por el proxy /api/icon (ver app/api/icon/route.ts).
export function unitIconUrl(imgKey?: string): string {
  if (!imgKey) return "";
  const path = IMG_MAP[imgKey];
  return path ? `/api/icon?p=${encodeURIComponent(path)}` : "";
}
