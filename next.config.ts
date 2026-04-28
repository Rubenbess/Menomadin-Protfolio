import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  // mailparser, msgreader, and isomorphic-dompurify (which pulls in jsdom)
  // depend on native-Node modules that can't be bundled. Without this list
  // Next.js bundles them and the email-attachment server action throws at
  // runtime ("Uploading…" stuck on the client).
  serverExternalPackages: [
    'mailparser',
    '@kenjiuno/msgreader',
    'isomorphic-dompurify',
    'jsdom',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
