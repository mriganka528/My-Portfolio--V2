import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.E2E_RUN === "true" ? ".next/e2e" : ".next",
  poweredByHeader: false,
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" }
      ]
    }];
  }
};

export default nextConfig;
