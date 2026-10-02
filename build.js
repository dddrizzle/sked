import fs from 'fs';

// Clean and create dist directory for Cloudflare Pages production deployment
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

// Copy static web assets
fs.copyFileSync('index.html', 'dist/index.html');
fs.cpSync('css', 'dist/css', { recursive: true });
fs.cpSync('js', 'dist/js', { recursive: true });

console.log('Build successful! Clean static assets prepared in dist/ (no .git or server files).');
