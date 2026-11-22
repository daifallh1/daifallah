/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  transpilePackages: ["@itil5/core"],
  images: { unoptimized: true },
};
export default nextConfig;
