import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Keep Prisma in Node, not the browser webpack graph (Auth/Storage use Supabase JS).
  serverExternalPackages: ['@prisma/client', 'sharp'],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

export default nextConfig
