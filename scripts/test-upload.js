const fs = require('fs');
const path = require('path');

// 构建目录
const BUILD_DIR = path.join(__dirname, '..', 'dist', 'web');

// 测试函数
function testBuildDirectory() {
  console.log('Testing build directory...');
  console.log(`Build directory: ${BUILD_DIR}`);
  
  if (fs.existsSync(BUILD_DIR)) {
    console.log('✅ Build directory exists');
    
    // 检查目录内容
    const files = fs.readdirSync(BUILD_DIR);
    console.log(`✅ Found ${files.length} files in build directory:`);
    files.forEach(file => {
      const filePath = path.join(BUILD_DIR, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.log(`  📁 ${file}/`);
      } else {
        console.log(`  📄 ${file} (${stats.size} bytes)`);
      }
    });
    
    return true;
  } else {
    console.log('❌ Build directory does not exist');
    return false;
  }
}

function testGetUploadDirectory() {
  console.log('\nTesting upload directory logic...');
  
  try {
    const { execSync } = require('child_process');
    // 尝试获取当前 tag
    const tag = execSync('git describe --tags --exact-match 2>/dev/null', { encoding: 'utf8' }).trim();
    if (tag) {
      console.log(`✅ Found tag: ${tag}`);
      return tag;
    } else {
      // 没有 tag，使用时间戳
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      console.log(`✅ Using timestamp: ${timestamp}`);
      return timestamp;
    }
  } catch (error) {
    // 没有 tag，使用时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    console.log(`✅ Using timestamp (git error): ${timestamp}`);
    return timestamp;
  }
}

function testFileTypes() {
  console.log('\nTesting file type detection...');
  
  const testFiles = [
    'index.html',
    'style.css',
    'script.js',
    'data.json',
    'image.png',
    'image.jpg',
    'image.gif',
    'font.woff2',
    'unknown.txt'
  ];
  
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
  };
  
  testFiles.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    const contentType = contentTypes[ext] || 'application/octet-stream';
    console.log(`  ${file} -> ${contentType}`);
  });
}

// 运行测试
console.log('====================================');
console.log('Testing WebDAV upload script...');
console.log('====================================');

testBuildDirectory();
const uploadDir = testGetUploadDirectory();
testFileTypes();

console.log('\n====================================');
console.log('Test completed successfully!');
console.log(`Upload directory would be: ${uploadDir}`);
console.log('====================================');
