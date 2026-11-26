/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  images: {
    // ImageKit resizes images itself (image-loader.js). Vercel's optimiser
    // is not used: its quota ran out and new images stopped loading (HTTP 402).
    loader: "custom",
    // Keep this file in the project root: on Windows, Turbopack cannot resolve
    // a loader inside a sub-folder (Next.js passes it a backslash path).
    loaderFile: "./image-loader.js",
  },
};

module.exports = nextConfig;
