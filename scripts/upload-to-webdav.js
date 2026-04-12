const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const http = require('http')
const https = require('https')

// 调试模式
const DEBUG = process.env.DEBUG === 'true' || false

// 获取 WebDAV 配置
const WEBDAV_URL = process.env.WEBDAV_URL
const WEBDAV_USERNAME = process.env.WEBDAV_USERNAME
const WEBDAV_PASSWORD = process.env.WEBDAV_PASSWORD
const WEBDAV_ROOT = process.env.WEBDAV_ROOT || ''

// 构建目录
const BUILD_DIR = path.join(__dirname, '..', 'dist', 'web')

// 上传成功和失败计数
let successCount = 0
let failureCount = 0

// 检查配置是否完整
if (!WEBDAV_URL || !WEBDAV_USERNAME || !WEBDAV_PASSWORD) {
  console.error('Error: WebDAV configuration is incomplete.')
  console.error(
    'Please set WEBDAV_URL, WEBDAV_USERNAME, and WEBDAV_PASSWORD environment variables.'
  )
  process.exit(1)
}

// 检查构建目录是否存在
if (!fs.existsSync(BUILD_DIR)) {
  console.error('Error: Build directory not found.')
  console.error('Please run "pnpm run build:web" first.')
  process.exit(1)
}

// 获取当前 tag 或时间戳
function getUploadDirectory() {
  try {
    // 尝试获取当前 tag
    const tag = execSync('git describe --tags --exact-match 2>/dev/null', {
      encoding: 'utf8'
    }).trim()
    if (tag) {
      console.log(`Using tag "${tag}" as upload directory.`)
      return tag
    }
  } catch (error) {
    // 没有 tag，使用时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    console.log(`No tag found, using timestamp "${timestamp}" as upload directory.`)
    return timestamp
  }

  // 兜底：如果 git 命令失败，使用时间戳
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  console.log(`Fallback to timestamp "${timestamp}" as upload directory.`)
  return timestamp
}

// 生成认证头
function getAuthHeader() {
  const auth = Buffer.from(`${WEBDAV_USERNAME}:${WEBDAV_PASSWORD}`).toString('base64')
  return `Basic ${auth}`
}

// WebDAV 请求函数
function webdavRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url)
      const options = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method,
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/octet-stream',
          ...headers
        }
      }

      if (DEBUG) {
        console.log(`[DEBUG] Request: ${method} ${url}`)
        console.log(`[DEBUG] Headers:`, JSON.stringify(options.headers, null, 2))
        if (body) {
          console.log(`[DEBUG] Body length: ${body.length} bytes`)
        }
      }

      const httpModule = parsedUrl.protocol === 'https:' ? https : http
      const req = httpModule.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (DEBUG) {
            console.log(`[DEBUG] Response: ${res.statusCode}`)
            console.log(`[DEBUG] Response data: ${data}`)
          }
          resolve({ statusCode: res.statusCode, data })
        })
      })

      req.on('error', (error) => {
        console.error(`[ERROR] Request error: ${error.message}`)
        reject(error)
      })

      if (body) {
        req.write(body)
      }

      req.end()
    } catch (error) {
      console.error(`[ERROR] Request setup error: ${error.message}`)
      reject(error)
    }
  })
}

// 创建目录
async function createDirectory(directoryUrl) {
  try {
    console.log(`Creating directory: ${directoryUrl}`)
    const response = await webdavRequest('MKCOL', directoryUrl)

    if (response.statusCode === 201) {
      console.log(`Directory created successfully: ${directoryUrl}`)
      return true
    } else if (response.statusCode === 405) {
      console.log(`Directory already exists: ${directoryUrl}`)
      return true
    } else if (response.statusCode === 409) {
      console.log(
        `Directory conflict (409) - may need to create parent directories first: ${directoryUrl}`
      )
      // 尝试创建父目录
      const parentUrl = directoryUrl.substring(0, directoryUrl.lastIndexOf('/'))
      if (parentUrl !== directoryUrl) {
        await createDirectory(parentUrl)
        // 再次尝试创建当前目录
        const retryResponse = await webdavRequest('MKCOL', directoryUrl)
        if (retryResponse.statusCode === 201 || retryResponse.statusCode === 405) {
          console.log(`Directory created successfully after parent creation: ${directoryUrl}`)
          return true
        }
      }
      return false
    } else {
      console.error(
        `Error creating directory ${directoryUrl}: ${response.statusCode} - ${response.data}`
      )
      return false
    }
  } catch (error) {
    console.error(`Error creating directory ${directoryUrl}: ${error.message}`)
    return false
  }
}

// 上传文件
async function uploadFile(localPath, remoteUrl) {
  try {
    const fileContent = fs.readFileSync(localPath)
    console.log(`Uploading file: ${localPath} -> ${remoteUrl}`)

    const response = await webdavRequest('PUT', remoteUrl, fileContent, {
      'Content-Length': fileContent.length,
      'Content-Type': getContentType(localPath)
    })

    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log(`Uploaded successfully: ${localPath}`)
      successCount++
      return true
    } else if (response.statusCode === 403) {
      console.error(`Permission denied (403) when uploading ${localPath} to ${remoteUrl}`)
      console.error(`Response data: ${response.data}`)
      // 尝试修复权限问题 - 检查 URL 格式
      const fixedRemoteUrl = fixWebDavUrl(remoteUrl)
      if (fixedRemoteUrl !== remoteUrl) {
        console.log(`Trying with fixed URL: ${fixedRemoteUrl}`)
        const retryResponse = await webdavRequest('PUT', fixedRemoteUrl, fileContent, {
          'Content-Length': fileContent.length,
          'Content-Type': getContentType(localPath)
        })
        if (retryResponse.statusCode === 200 || retryResponse.statusCode === 201) {
          console.log(`Uploaded successfully with fixed URL: ${localPath}`)
          successCount++
          return true
        }
      }
      failureCount++
      return false
    } else {
      console.error(`Error uploading ${localPath}: ${response.statusCode} - ${response.data}`)
      failureCount++
      return false
    }
  } catch (error) {
    console.error(`Error uploading ${localPath}: ${error.message}`)
    failureCount++
    return false
  }
}

// 修复 WebDAV URL 格式
function fixWebDavUrl(url) {
  // 确保 URL 以 / 结尾
  if (!url.endsWith('/')) {
    return url
  }
  return url
}

// 获取文件内容类型
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  }
  return contentTypes[ext] || 'application/octet-stream'
}

// 递归上传目录
async function uploadDirectory(localDir, remoteDir) {
  // 创建远程目录
  const dirCreated = await createDirectory(remoteDir)
  if (!dirCreated) {
    console.error(`Failed to create directory: ${remoteDir}`)
    return
  }

  // 读取本地目录
  try {
    const files = fs.readdirSync(localDir)
    console.log(`Uploading ${files.length} items from ${localDir}`)

    for (const file of files) {
      const localPath = path.join(localDir, file)
      const remotePath = `${remoteDir}/${file}`
      const stats = fs.statSync(localPath)

      if (stats.isDirectory()) {
        // 递归上传子目录
        await uploadDirectory(localPath, remotePath)
      } else {
        // 上传文件
        await uploadFile(localPath, remotePath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${localDir}: ${error.message}`)
  }
}

// 主函数
async function main() {
  console.log('Starting WebDAV upload...')
  console.log('====================================')

  // 打印配置信息（隐藏敏感信息）
  console.log(`WebDAV URL: ${WEBDAV_URL}`)
  console.log(`WebDAV Username: ${WEBDAV_USERNAME}`)
  console.log(`WebDAV Root: ${WEBDAV_ROOT || '(empty)'}`)
  console.log(`Build Directory: ${BUILD_DIR}`)
  console.log('====================================')

  // 获取上传目录
  const uploadDir = getUploadDirectory()

  // 构建远程 URL
  const remoteBaseUrl = `${WEBDAV_URL}${WEBDAV_ROOT ? `/${WEBDAV_ROOT}` : ''}/${uploadDir}`

  console.log(`Uploading to: ${remoteBaseUrl}`)
  console.log('====================================')

  // 开始上传
  await uploadDirectory(BUILD_DIR, remoteBaseUrl)

  // 打印上传结果
  console.log('====================================')
  console.log(`Upload Summary:`)
  console.log(`Successfully uploaded: ${successCount} files`)
  console.log(`Failed to upload: ${failureCount} files`)

  if (failureCount > 0) {
    console.error('Upload completed with errors!')
    process.exit(1)
  } else {
    console.log('Upload completed successfully!')
    console.log(`Uploaded to: ${remoteBaseUrl}`)
  }
}

// 运行主函数
main().catch((error) => {
  console.error('Error during upload:', error)
  process.exit(1)
})
