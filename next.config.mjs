/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  // Prevent webpack from bundling the native libsql binaries used in local dev.
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
