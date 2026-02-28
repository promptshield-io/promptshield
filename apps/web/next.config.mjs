import { createMDX } from "fumadocs-mdx/next";

/** Detect GitHub Actions */
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

console.log({ isGitHubActions });

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(isGitHubActions && {
    // basePath: "/promptshield", // we are publishing to https://promptshield.js.org/ -- so remove basePath
    output: "export",
  }),
};

export default withMDX(config);
