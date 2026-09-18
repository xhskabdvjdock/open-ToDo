import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Tree-shake barrel imports (lucide-react is the big one) so client
  // bundles stay small and interactions load fast.
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner", "next-themes", "date-fns"],
    // Keep dynamic route data in the client router cache briefly so
    // back/forward navigation feels instant. Server Actions still
    // revalidate on every mutation, so data never goes stale.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
