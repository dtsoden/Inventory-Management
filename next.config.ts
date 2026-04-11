import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
