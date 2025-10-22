import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  images: {
    domains: ['iewqfmkngcgayxbbnpiz.supabase.co'],
  },
};

export default nextConfig;
