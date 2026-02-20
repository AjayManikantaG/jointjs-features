import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable styled-components SWC compiler for SSR
  compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
