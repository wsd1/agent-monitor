import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // 禁用图片优化（静态导出不支持）
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
