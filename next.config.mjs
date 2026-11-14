import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  trailingSlash: true,
  turbopack: { root: path.resolve(process.cwd()) },
  async redirects() {
    return [
    {
        "source": "/category/blog/rpa/",
        "destination": "/category/rpa/",
        "permanent": true
    },
    {
        "source": "/category/blog/product-engineering/",
        "destination": "/category/product-engineering/",
        "permanent": true
    },
    {
        "source": "/category/blog/data-tandem/",
        "destination": "/category/data-tandem/",
        "permanent": true
    },
    {
        "source": "/category/blog/quality-ascent/",
        "destination": "/category/quality-ascent/",
        "permanent": true
    },
    {
        "source": "/category/blog/ai-blog/",
        "destination": "/category/ai-blog/",
        "permanent": true
    },
    {
        "source": "/what-role-does-data-analytics-play-in-the-software-testing-process/",
        "destination": "/blog/what-role-does-data-analytics-play-in-the-software-testing-process/",
        "permanent": true
    },
    {
        "source": "/demo/hotel-bot-demo/",
        "destination": "/hotel-bot-demo/",
        "permanent": true
    },
    {
        "source": "/blog/best-ai-development-services/",
        "destination": "/blog/best-ai-development-solution-guide/",
        "permanent": true
    },
    {
        "source": "/salesforce/",
        "destination": "/salesforce-consulting/",
        "permanent": true
    }
];
  },
};
export default nextConfig;
