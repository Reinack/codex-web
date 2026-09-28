// Acceso a variables de entorno SOLO de servidor. Al no llevar prefijo NEXT_PUBLIC_,
// Next.js garantiza que `CODEX_API_BASE` jamás se incluye en el bundle del browser:
// el navegador nunca ve la URL ni las credenciales del backend (patrón BFF).
// `||` y no `??`: una línea `CODEX_API_BASE=` vacía en .env.local también cae al default.
const CODEX_API_BASE =
  process.env.CODEX_API_BASE || "https://aoe2-codex.onrender.com";

export const env = {
  CODEX_API_BASE: CODEX_API_BASE.replace(/\/$/, ""), // sin slash final
} as const;
