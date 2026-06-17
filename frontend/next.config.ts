import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      accounts: "./turbopack-empty-module.js",
    },
  },
};

export default nextConfig;
