import { createMDX } from "fumadocs-mdx/next";

/** Detect GitHub Actions */
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(isGitHubActions && {
    basePath: "/promptshield",
  }),
};

export default withMDX(config);
