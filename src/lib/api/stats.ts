import "server-only";
import { fetchCodex, REVALIDATE } from "./client";
import { StatsSchema, type Stats } from "./schema";

export function getStats(): Promise<Stats> {
  return fetchCodex("/api/stats", StatsSchema, { revalidate: REVALIDATE.civs });
}
