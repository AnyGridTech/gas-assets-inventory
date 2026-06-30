const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy appsscript.json
console.log('Copying appsscript.json to dist...');
fs.copyFileSync('appsscript.json', 'dist/appsscript.json');

// Copy server TS files to dist
console.log('Copying server TS files to dist...');
const serverDir = 'server';
const files = fs.readdirSync(serverDir);
files.forEach(file => {
  if (file.endsWith('.ts')) {
    fs.copyFileSync(path.join(serverDir, file), path.join('dist', file));
  }
});

// Since GAS uses capitalized HTML files (like Index.html), but Vite produces index.html,
// we rename index.html to Index.html inside dist/
if (fs.existsSync('dist/index.html')) {
  fs.renameSync('dist/index.html', 'dist/Index.html');
  console.log('Renamed index.html to Index.html');
}

console.log('Build and backend copy completed successfully!');
