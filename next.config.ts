import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/agent-monitor',
  assetPrefix: '/agent-monitor/',
  // 禁用生成 Source Map（减少体积显著）
  productionBrowserSourceMaps: false,

  // 禁用图片优化（静态导出不支持）
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
