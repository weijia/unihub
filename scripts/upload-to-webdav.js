const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

// 获取 WebDAV 配置
const WEBDAV_URL = process.env.WEBDAV_URL;
const WEBDAV_USERNAME = process.env.WEBDAV_USERNAME;
const WEBDAV_PASSWORD = process.env.WEBDAV_PASSWORD;
const WEBDAV_ROOT = process.env.WEBDAV_ROOT || '';

// 构建目录
const BUILD_DIR = path.join(__dirname, '..', 'dist', 'web');

// 检查配置是否完整
if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
  console.error('Error: WebDAV configuration is incomplete.');
  console.error('Please set WEBDAV_URL, WEBDAV_USERNAME, and WEBDAV_PASSWORD environment variables.');
  process.exit(1);
}

// 检查构建目录是否存在
if (!fs.existsSync(BUILD_DIR)) {
  console.error('Error: Build directory not found.');
  console.error('Please run "pnpm run build:web" first.');
  process.exit(1);
}

// 获取当前 tag 或时间戳
function getUploadDirectory() {
  try {
    // 尝试获取当前 tag
    const tag = execSync('git describe --tags --exact-match 2>/dev/null', { encoding: 'utf8' }).trim();
    if (tag) {
      console.log(`Using tag "${tag}" as upload directory.`);
      return tag;
    }
  } catch (error) {
    // 没有 tag，使用时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    console.log(`No tag found, using timestamp "${timestamp}" as upload directory.`);
    return timestamp;
  }
}

// 生成认证头
function getAuthHeader() {
  const auth = Buffer.from(`${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`).toString('base64');
  return `Basic ${auth}`;
}

// WebDAV 请求函数
function webdavRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method,
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/octet-stream',
        ...headers
      }
    };

    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

// 创建目录
async function createDirectory(directoryUrl) {
  try {
    const response = await webdavRequest('MKCOL', directoryUrl);
    if (response.statusCode === 201 || response.statusCode === 405) {
      // 201: 目录创建成功
      // 405: 目录已存在
      return true;
    } else {
      console.error(`Error creating directory: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.error(`Error creating directory: ${error.message}`);
    return false;
  }
}

// 上传文件
async function uploadFile(localPath, remoteUrl) {
  try {
    const fileContent = fs.readFileSync(localPath);
    const response = await webdavRequest('PUT', remoteUrl, fileContent, {
      'Content-Length': fileContent.length
    });
    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log(`Uploaded: ${localPath} -> ${remoteUrl}`);
      return true;
    } else {
      console.error(`Error uploading file: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.error(`Error uploading file: ${error.message}`);
    return false;
  }
}

// 递归上传目录
async function uploadDirectory(localDir, remoteDir) {
  // 创建远程目录
  await createDirectory(remoteDir);

  // 读取本地目录
  const files = fs.readdirSync(localDir);
  for (const file of files) {
    const localPath = path.join(localDir, file);
    const remotePath = `${remoteDir}/${file}`;
    const stats = fs.statSync(localPath);

    if (stats.isDirectory()) {
      // 递归上传子目录
      await uploadDirectory(localPath, remotePath);
    } else {
      // 上传文件
      await uploadFile(localPath, remotePath);
    }
  }
}

// 主函数
async function main() {
  console.log('Starting WebDAV upload...');
  
  // 获取上传目录
  const uploadDir = getUploadDirectory();
  
  // 构建远程 URL
  const remoteBaseUrl = `${WEBDAV_URL}${WEBDAV_ROOT ? `/${WEBDAV_ROOT}` : ''}/${uploadDir}`;
  
  console.log(`Uploading to: ${remoteBaseUrl}`);
  
  // 开始上传
  await uploadDirectory(BUILD_DIR, remoteBaseUrl);
  
  console.log('Upload completed successfully!');
  console.log(`Uploaded to: ${remoteBaseUrl}`);
}

// 运行主函数
main().catch((error) => {
  console.error('Error during upload:', error);
  process.exit(1);
});
