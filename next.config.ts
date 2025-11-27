import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iewqfmkngcgayxbbnpiz.supabase.co',
        // optional: pathPattern: '/**',
      },
    ],
  },
};

export default nextConfig;
