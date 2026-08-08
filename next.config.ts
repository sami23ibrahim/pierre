import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin file tracing to this project. Without it, a stray package-lock.json in
  // the user's home directory makes Next treat C:\Users\<user> as the workspace
  // root and crawl the whole profile during builds (minutes instead of seconds).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
