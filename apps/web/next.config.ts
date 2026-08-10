import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The review UI ships as raw TSX source in the workspace package; let
  // Next's compiler handle it like first-party code.
  transpilePackages: ["@trail/review", "@trail/tokens"],
};

export default nextConfig;
