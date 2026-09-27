import type { Metadata } from "next";
import { Cinzel, Crimson_Pro } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { Providers } from "./providers";

// Tipografía de la guía de estilo del árbol: Cinzel (capitales romanas) para
// títulos y botones, Crimson Pro para el texto.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const crimson = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
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
          <div className="mx-auto w-full max-w-5xl flex-1 px-3 pb-10 pt-5 sm:px-4">
            <div className="sheet px-4 py-6 sm:px-8 sm:py-8">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
