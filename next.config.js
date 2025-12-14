/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Disabled: causes `next build` to crash with `TypeError: Cannot read properties of undefined (reading 'length')`
    // on this project (Next.js 15.5.7).
    // optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  
  // Image optimization settings
  images: {
    // Enable image optimization
    formats: ['image/webp', 'image/avif'],
    // Allow external image domains if needed
    // domains: [],
    // Image sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimize layout shift
    minimumCacheTTL: 60,
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Optimize bundle size with code splitting
    config.optimization.splitChunks = {
      ...config.optimization.splitChunks,
      cacheGroups: {
        ...config.optimization.splitChunks.cacheGroups,
        // Split vendor chunks
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
        },
        // Split admin components into separate chunk
        admin: {
          test: /[\\/]src[\\/]components[\\/]admin[\\/]/,
          name: 'admin',
          chunks: 'all',
          minSize: 10000,
        },
      },
    }

    // Note: usedExports removed to prevent conflict with cacheUnaffected
    // Next.js handles tree shaking automatically
    
    return config
  },

  // Enable compression
  compress: true,
  
  // ESLint configuration for build
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['src'],
    // Don't fail build on ESLint warnings in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  
  // PWA and performance headers
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        // Cache static assets
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
