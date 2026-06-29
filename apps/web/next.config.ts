import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ontime/validators'],
  experimental: {
    typedRoutes: true,
  },
}

export default nextConfig
