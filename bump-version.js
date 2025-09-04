#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function bumpVersion(manifestPath) {
  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);
  
  const currentVersion = manifest.version;
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  const newVersion = `${major}.${minor}.${patch + 1}`;
  
  manifest.version = newVersion;
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  
  console.log(`${path.basename(manifestPath)}: ${currentVersion} → ${newVersion}`);
  return newVersion;
}

function main() {
  const chromeManifest = path.join(__dirname, 'manifest.json');
  const firefoxManifest = path.join(__dirname, 'manifest-firefox.json');
  
  if (fs.existsSync(chromeManifest)) {
    bumpVersion(chromeManifest);
  }
  
  if (fs.existsSync(firefoxManifest)) {
    bumpVersion(firefoxManifest);
  }
  
  console.log('版本号已自动更新完成！');
}

if (require.main === module) {
  main();
}