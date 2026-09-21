import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["*.ngrok-free.app", "192.168.0.162"],
  serverExternalPackages: ["@base-org/account", "@coinbase/cdp-sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.icons8.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
