import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mastra/*"],
  // webpack: (config) => {
  //   config.resolve.fallback = {
  //     stream: false,
  //     fs: false,
  //     tls: false,
  //     net: false,
  //     zlib: false,
  //     http: false,
  //     url: false,
  //     http2: false,
  //     dns: false,
  //     os: false,
  //     path: false,
  //   };
  //   return config;
  // },
};

export default nextConfig;
