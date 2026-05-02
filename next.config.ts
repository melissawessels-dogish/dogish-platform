import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/explore', destination: '/discover', permanent: true },
    ]
  },
  experimental: {
    allowedDevOrigins: ['localhost'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'bhvznmiryprbevwmqxuc.supabase.co',
      },
    ],
  },
};

export default nextConfig;
