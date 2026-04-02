/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force jspdf to use browser build (avoids fflate Worker in node build)
  turbopack: {
    resolveAlias: {
      jspdf: "jspdf/dist/jspdf.es.min.js",
    },
  },


  allowedDevOrigins: ['156.67.110.186'],

}

export default nextConfig
