import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to successfully complete even if
    // there are TypeScript errors in the project.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
