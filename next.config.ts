import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No usar "standalone" en Vercel - ellos manejan el servidor
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
