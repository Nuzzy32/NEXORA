import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Keep the dev badge off the sidebar's user chip.
  devIndicators: { position: "bottom-right" },
  // Runs before the proxy, which then sends signed-out visitors on to /login.
  redirects: async () => [{ source: "/", destination: "/dashboard", permanent: false }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
