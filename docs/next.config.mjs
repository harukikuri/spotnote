import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Pages that moved, so old links still land.
  async redirects() {
    return [{ source: '/troubleshooting', destination: '/faq', permanent: true }];
  },
  // The playground (playground/, built into public/try/) is a page of its own.
  async rewrites() {
    return [{ source: '/try', destination: '/try/index.html' }];
  },
};

const withMDX = createMDX();

export default withMDX(config);
