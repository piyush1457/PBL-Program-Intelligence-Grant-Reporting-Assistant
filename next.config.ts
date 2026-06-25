import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./m4c_dashboard.db'],
  },
};

export default nextConfig;
