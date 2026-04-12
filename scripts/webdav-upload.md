# WebDAV 上传功能使用说明

## 功能介绍

本项目提供了自动构建并上传到 WebDAV 服务器的功能，支持在 GitHub 和 Gitee 上自动执行。当代码推送或创建 tag 时，会自动构建 Web 版本并上传到配置的 WebDAV 服务器。

## 配置步骤

### 1. 设置 WebDAV 服务器信息

在 GitHub 和 Gitee 仓库中，需要设置以下 secrets：

| Secret 名称       | 说明                  | 示例                         |
| ----------------- | --------------------- | ---------------------------- |
| `WEBDAV_URL`      | WebDAV 服务器 URL     | `https://webdav.example.com` |
| `WEBDAV_USERNAME` | WebDAV 用户名         | `username`                   |
| `WEBDAV_PASSWORD` | WebDAV 密码           | `password`                   |
| `WEBDAV_ROOT`     | WebDAV 根路径（可选） | `my-app`                     |

### 2. 工作流程

1. **代码推送**：当代码推送到 `main`、`master` 或 `develop` 分支时，触发构建和上传流程
2. **Tag 创建**：当创建新的 tag 时，触发构建和上传流程
3. **PR 触发**：当创建或更新 PR 时，触发构建和上传流程

### 3. 上传目录结构

- **有 tag 时**：使用 tag 名称作为子目录
- **无 tag 时**：使用时间戳作为子目录

上传路径格式：`${WEBDAV_URL}/${WEBDAV_ROOT}/${upload_directory}`

## 本地测试

### 1. 构建 Web 版本

```bash
pnpm run build:web
```

### 2. 运行测试脚本

```bash
node scripts/test-upload.js
```

### 3. 本地上传测试

```bash
# 设置环境变量
set WEBDAV_URL=https://webdav.example.com
set WEBDAV_USERNAME=username
set WEBDAV_PASSWORD=password
set WEBDAV_ROOT=my-app

# 运行上传脚本
node scripts/upload-to-webdav.js
```

## 调试模式

如需启用调试模式，设置 `DEBUG=true` 环境变量：

```bash
set DEBUG=true
node scripts/upload-to-webdav.js
```

## 常见问题

### 1. 409 错误（目录冲突）

**原因**：尝试创建目录时，父目录不存在
**解决方案**：脚本会自动尝试创建父目录，无需手动干预

### 2. 403 错误（权限拒绝）

**原因**：WebDAV 服务器拒绝访问请求
**解决方案**：

- 检查 WebDAV 用户名和密码是否正确
- 检查 WebDAV 服务器权限设置
- 确保 WebDAV 服务器支持 PUT 和 MKCOL 请求

### 3. 上传失败

**解决方案**：

- 检查网络连接
- 检查 WebDAV 服务器状态
- 查看 GitHub/Gitee Actions 日志获取详细错误信息

## 文件说明

- `upload-to-webdav.js`：WebDAV 上传脚本
- `test-upload.js`：测试脚本，用于本地验证构建目录和上传逻辑
- `build-upload-webdav.yml`：GitHub Actions 工作流文件
- `gitee-build-upload-webdav.yml`：Gitee Actions 工作流文件

## 注意事项

- 确保 WebDAV 服务器支持基本认证
- 确保 WebDAV 服务器有足够的存储空间
- 上传过程中请保持网络连接稳定
- 对于大型构建，上传时间可能会较长
