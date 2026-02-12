/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/crm/:path*',
        destination: '/crm/index.html',
      },
    ];
  },
};

export default nextConfig;
