import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to successfully complete even if
    // there are TypeScript errors in the project.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during production builds so lint errors
    // never block a deploy (e.g. on Vercel).
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
