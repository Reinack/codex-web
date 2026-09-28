import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { ContentFrame } from "@/components/ContentFrame";
import { Providers } from "./providers";

// Tipografía de la guía de estilo del árbol: Cinzel (capitales romanas) para
// títulos y botones, Crimson Pro para el texto. Se sirven desde el proyecto
// (Fontsource, OFL) y no desde Google Fonts: next/font/google las baja en cada
// build y a veces Turbopack no procesa la respuesta ("next/font/google queries
// have exactly one entry"), lo que rompía el build en Vercel.
const cinzel = localFont({
  variable: "--font-cinzel",
  src: "../../node_modules/@fontsource-variable/cinzel/files/cinzel-latin-wght-normal.woff2",
  weight: "400 900",
  display: "swap",
});

const crimson = localFont({
  variable: "--font-crimson",
  src: [
    {
      path: "../../node_modules/@fontsource-variable/crimson-pro/files/crimson-pro-latin-wght-normal.woff2",
      weight: "200 900",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/crimson-pro/files/crimson-pro-latin-wght-italic.woff2",
      weight: "200 900",
      style: "italic",
    },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AoE2 Codex",
    template: "%s · AoE2 Codex",
  },
  description:
    "La cara pública del grafo de conocimiento de Age of Empires II: civilizaciones, counters y chat GraphRAG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cinzel.variable} ${crimson.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          {/* Madera = fondo; todo el contenido de cada vista va en una hoja de pergamino. */}
          <ContentFrame>{children}</ContentFrame>
        </Providers>
      </body>
    </html>
  );
}
