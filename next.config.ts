import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@base-org/account", "@coinbase/cdp-sdk"],
};

export default nextConfig;
