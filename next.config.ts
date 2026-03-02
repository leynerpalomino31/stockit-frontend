/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // ✅ para despliegue fácil (artefacto autocontenido)
  output: "standalone",
};

export default nextConfig;