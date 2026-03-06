import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withNextVideo } from "next-video/process";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "192.168.88.36",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "192.168.100.12",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "172.21.0.4",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.galamat.kz",
        pathname: "/uploads/**",
      }
    ],
  },
};

export default withNextVideo(withNextIntl(nextConfig));