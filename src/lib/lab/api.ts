// Cliente del BFF del Lab (/api/lab/*). Los datos son los JSON del Express; acá solo se tipan en el uso.
export async function labGet<T>(path: string, params?: Record<string, string | number | undefined | null>): Promise<T> {
  const qs = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)])).toString()
    : "";
  const res = await fetch(`/api/lab/${path}${qs === "?" ? "" : qs}`);
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json;
}

export async function labPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/lab/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
  return json;
}
