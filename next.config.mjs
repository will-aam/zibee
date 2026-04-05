import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,

  // Desativa o PWA se estiver rodando localmente (dev) para parar o loop
  disable: process.env.NODE_ENV === "development",

  // ========================================================
  // ESTRATÉGIA ANTI-ZUMBI: ATUALIZAÇÃO AGRESSIVA DO CACHE
  // ========================================================
  register: true,
  skipWaiting: true, // Força o novo Service Worker a assumir imediatamente
  cleanupOutdatedCaches: true, // Apaga automaticamente o cache de versões antigas
  // ========================================================

  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);
