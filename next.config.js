/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    // Local images from /public folder work by default.
    // Add domains here only if using external image URLs.
    domains: [],
  },
}

module.exports = nextConfig
