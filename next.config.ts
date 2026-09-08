import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@base-org/account", "@coinbase/cdp-sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.icons8.com" },
    ],
  },
};

export default nextConfig;
