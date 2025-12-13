import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Tesseract.jsのWebAssemblyサポート
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  // Tesseract.jsの静的アセットを許可（Next.js 16の新しい形式）
  serverExternalPackages: ["tesseract.js"],
  // Turbopackとwebpackの競合を解決
  turbopack: {},
};

export default nextConfig;
