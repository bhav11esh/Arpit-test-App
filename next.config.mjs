/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Only rewrite /crm/* paths that don't contain a dot (i.e. not asset files like .js/.css/.png)
        source: '/crm/:path([^.]*)',
        destination: '/crm/index.html',
      },
    ];
  },
};

export default nextConfig;
