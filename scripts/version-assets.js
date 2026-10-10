const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.join(__dirname, '..');
const index = path.join(root, 'index.html');
let html = fs.readFileSync(index, 'utf8');
for (const file of ['app.js', 'scoring.js', 'style.css']) {
  // Normalize line endings so Windows checkouts and GitHub deployments agree.
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  const version = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const attribute = file.endsWith('.css') ? 'href' : 'src';
  html = html.replace(new RegExp(`${attribute}="${file.replace('.', '\\.')}[^\"]*"`), `${attribute}="${file}?v=${version}"`);
}
fs.writeFileSync(index, html);
