import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Enable WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Handle worker threads
    config.resolve.fallback = {
      ...config.resolve.fallback,
      worker_threads: false,
    };

    return config;
  },
  // Ensure WASM files are copied to the output
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable static page generation
  staticPageGenerationTimeout: 0,
  // Disable automatic static optimization
  experimental: {
    disableOptimizedLoading: true,
  },
};

export default nextConfig;
