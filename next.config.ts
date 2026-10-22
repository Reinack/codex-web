import type { NextConfig } from "next";

// Los emblemas de las civs (PNG) los sirve el backend de aoe2-codex en
// /img/civs/{slug}.png. Autorizamos ese host para usar <Image> de next/image.
const codexHost = (() => {
  try {
    return new URL(process.env.CODEX_API_BASE ?? "https://aoe2-codex.onrender.com")
      .hostname;
  } catch {
    return "aoe2-codex.onrender.com";
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: codexHost, pathname: "/img/**" }],
  },
};

export default nextConfig;
