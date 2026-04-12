import withSerwist from "@serwist/next";

const nextConfig = withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
})({});

export default nextConfig;
