import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Baked in at build time so client and server show the same version
  // without shipping package.json to the browser.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Docusaurus generates pretty-URL output (e.g. /docs/user/getting-started/index.html).
  // Next.js does not auto-serve index.html from /public, so rewrite extension-less
  // /docs/* requests to their underlying index.html. Anything with an extension
  // (assets, sitemaps, images) falls through to the normal static handler.
  async rewrites() {
    return [
      {
        source: '/docs/:slug((?!.*\\.[^/]+$).*)',
        destination: '/docs/:slug/index.html',
      },
      {
        source: '/docs',
        destination: '/docs/index.html',
      },
    ];
  },
};

export default nextConfig;
