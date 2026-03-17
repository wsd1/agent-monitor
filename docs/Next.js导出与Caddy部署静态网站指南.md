# Next.js 导出与 Caddy 部署静态网站指南
---

本指南记录了将 Next.js 项目作为静态网页迁移至 NAS（或 Linux 服务器），并使用 Caddy 进行多应用并存部署的全过程。

## 1. 项目构建配置 (开发环境)
由于 Next.js 默认假设应用运行在域名根目录（/），若要将其部署在子路径（如 http://IP/agent-monitor），必须进行额外配置。

修改 next.config.js
在项目根目录下编辑配置文件：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // 开启静态导出模式
  basePath: '/agent-monitor', // 设置基础路径，确保 JS/CSS 资源引用正确
  assetPrefix: '/agent-monitor/',

  // 禁用生成 Source Map（减少体积显著）
  productionBrowserSourceMaps: false,
  // 禁用静态路由清单（如果你的页面很少）
  // 提示：这会减少 .json 文件的生成

  images: {
    unoptimized: true,       // 静态导出不支持 Next.js 默认的图片优化
  },
};

module.exports = nextConfig;
```



执行构建
在终端运行：

```bash
npm run build
```

构建完成后，项目根目录会生成一个 out 文件夹。



终极瘦身：单文件化 (Single HTML File)

原理是启动一个chrome打开网页，从devtool工具组织构造单html。因此需要首先去除预设子路径，修改 next.config.js:
去除下面两行：
```
  basePath: '/agent-monitor', // 设置基础路径，确保 JS/CSS 资源引用正确
  assetPrefix: '/agent-monitor/',
```
并 npm run build

开启服务
```bash
npx serve out

npx single-file-cli http://localhost:3000 ./dist/monitor.html --browser-executable-path /usr/bin/google-chrome

```





## 2. 环境准备与文件传输 (NAS)
目录结构规划
为了方便管理多个应用，建议在 NAS 上建立统一的 Web 根目录：

```text
/home/wsd1/www/
└── agent-monitor/    # 存放 Next.js 导出的内容
    ├── index.html
    ├── _next/
    └── ...
```

传输文件
将开发机中 out 文件夹内的所有内容拷贝到 NAS 的 ~/www/agent-monitor/ 目录下。

## 3. Caddy 安装与配置
权限设置 (关键)
Caddy 作为一个独立服务，默认无法读取用户家目录（Home）。必须赋予读取权限：

```bash
# 允许 Caddy 进入家目录
sudo chmod 755 /home/wsd1
# 递归允许读取 www 文件夹下的所有内容
sudo chmod -R 755 /home/wsd1/www
```

配置 Caddyfile
编辑配置文件 sudo nano /etc/caddy/Caddyfile：

```caddyfile
:80 {
    # 设置 Web 根目录（必须是绝对路径）
    root * /home/wsd1/www

    # 开启目录浏览功能（方便作为网页汇总页）
    file_server browse

    # 处理 Next.js 子路径路由与 404 问题
    handle_path /agent-monitor/* {
        root * /home/wsd1/www/agent-monitor
        # 尝试匹配路径、带.html的路径，最后回退到 index.html
        try_files {path} {path}.html /index.html
        file_server
    }
}
```

应用配置

```bash
# 格式化配置文件（消除警告）
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
# 重新加载配置
sudo caddy reload --config /etc/caddy/Caddyfile
```

## 4. 常见问题调测
403 Forbidden (权限拒绝)
原因：Caddy 无权访问目录或 www 路径权限过低。
解决：检查 chmod 755 是否执行到位。


## 5. 未来扩展
若需增加新页面（如 blog），只需：
在 ~/www/ 下新建 blog 文件夹。
在 Caddyfile 中添加对应的 handle_path 块。
由于开启了 file_server browse，访问 http://<NAS_IP> 即可看到所有应用的汇总列表。

