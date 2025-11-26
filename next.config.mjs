// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/b2b",
  trailingSlash: true,
  images: {
    domains: ["atlaz-content.s3.ap-southeast-1.amazonaws.com"],
  },
};
export default nextConfig;
