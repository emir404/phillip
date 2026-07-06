/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We lint the whole monorepo with Biome, so skip Next's ESLint pass at build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
