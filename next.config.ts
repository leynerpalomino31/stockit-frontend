/** @type {import('next').NextConfig} */
const nextConfig = {
  // 👇 si ya tienes otras opciones, déjalas aquí
  eslint: {
    // ❌ No romper el build por errores de ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ❌ No romper el build por errores de TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
