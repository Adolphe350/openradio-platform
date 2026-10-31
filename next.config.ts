import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow large file uploads (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "52mb",
    },
  },
  async headers() {
    const shared = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    ];
    return [
      {
        // Everything except the embeddable player stays same-origin only.
        source: "/((?!embed/).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...shared,
        ],
      },
      {
        // /embed/<slug> is meant to be iframed on station owners' websites.
        source: "/embed/:slug*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          ...shared,
        ],
      },
    ];
  },
};

export default nextConfig;
