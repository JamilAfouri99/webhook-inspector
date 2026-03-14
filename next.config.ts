// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['jsonwebtoken', 'pg', '@prisma/adapter-pg'],
}

export default nextConfig
