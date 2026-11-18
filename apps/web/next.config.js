/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return [
      {
        source: "/login.html",
        destination: "/login",
      },
      {
        source: "/signin",
        destination: "/login",
      },
      {
        source: "/sign-in",
        destination: "/login",
      },
    ];
  },
};

module.exports = nextConfig;
