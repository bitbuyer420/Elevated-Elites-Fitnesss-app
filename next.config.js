/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },

  /*
   * Build-time env fallbacks for Supabase.
   *
   * Why: Next.js App Router renders 'use client' component shells on the
   * server even during the build phase, so `createBrowserClient()` is called
   * before real env vars are available. These placeholder strings allow the
   * build to succeed — the real NEXT_PUBLIC_* values from .env.local are
   * always used at runtime.
   *
   * These placeholder values are NEVER used in production if .env.local is
   * present; process.env takes precedence over this fallback.
   */
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
  },
}

module.exports = nextConfig
