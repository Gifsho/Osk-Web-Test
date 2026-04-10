const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const CHROME_DIR = path.join(DIST_DIR, 'chrome');
const FIREFOX_DIR = path.join(DIST_DIR, 'firefox');

// Files and folders to ignore during copy
const IGNORE_LIST = [
  'dist',
  'build.js',
  '.git',
  '.gitignore',
  '.vscoderules',
  'node_modules',
  'package.json',
  'package-lock.json',
  'README.md',
];

/**
 * Clean up dist directory
 */
function clean() {
  if (fs.existsSync(DIST_DIR)) {
    console.log('🧹 Cleaning dist directory...');
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(CHROME_DIR, { recursive: true });
  fs.mkdirSync(FIREFOX_DIR, { recursive: true });
}

/**
 * Filter function for fs.cpSync
 */
function copyFilter(src) {
  const base = path.basename(src);
  return !IGNORE_LIST.includes(base);
}

/**
 * Copy all extension files to a target directory
 */
function copyFiles(targetDir) {
  fs.readdirSync(ROOT_DIR).forEach(file => {
    if (IGNORE_LIST.includes(file)) return;
    
    const srcPath = path.join(ROOT_DIR, file);
    const destPath = path.join(targetDir, file);
    
    fs.cpSync(srcPath, destPath, { 
      recursive: true,
      filter: copyFilter 
    });
  });
}

/**
 * Adjust manifest.json specifically for Firefox
 */
function modifyFirefoxManifest() {
  const manifestPath = path.join(FIREFOX_DIR, 'manifest.json');
  const manifestData = fs.readFileSync(manifestPath, 'utf8');
  let manifest = JSON.parse(manifestData);

  console.log('🦊 Adapting Manifest v3 for Firefox...');

  // Firefox MV3 uses background.scripts instead of service_worker
  if (manifest.background && manifest.background.service_worker) {
    const swScript = manifest.background.service_worker;
    delete manifest.background.service_worker;
    manifest.background.scripts = [swScript];
  }

  // Firefox needs Gecko ID for Manifest V3 background scripts to work properly
  manifest.browser_specific_settings = {
    gecko: {
      id: "sosk-extension@yossy.com",
      strict_min_version: "109.0"
    }
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function build() {
  console.log('🚀 Starting SOSK Build Process...');
  
  clean();

  console.log('📦 Copying files for Chrome build...');
  copyFiles(CHROME_DIR);

  console.log('📦 Copying files for Firefox build...');
  copyFiles(FIREFOX_DIR);
  
  modifyFirefoxManifest();

  console.log('✅ Build complete!');
  console.log('➡️  Chrome extension is ready in   : dist/chrome');
  console.log('➡️  Firefox extension is ready in  : dist/firefox');
}

build();
