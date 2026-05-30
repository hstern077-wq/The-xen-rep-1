import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A sibling lockfile exists higher
  // up in the repo, so without this Next.js may infer the wrong root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
