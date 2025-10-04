import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true,
    serverActions: {},
  },
  env: {
    // NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
  },
  transpilePackages: ["@mep-agency/next-iubenda"],
  reactStrictMode: true,
  sassOptions: {
    additionalData: ``,
    includePaths: [path.join(__dirname, "src/access/css")],
    prependData: `
      @use "mixins" as *;
      @use "fonts" as *;
    `,
  },
  images: {
    remotePatterns: [
      {
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload", // Հատուկ պարամետրեր
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), camera=(), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
