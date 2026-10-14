import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Pages that moved, so old links still land.
  async redirects() {
    return [{ source: '/troubleshooting', destination: '/faq', permanent: true }];
  },
};

const withMDX = createMDX();

export default withMDX(config);
