const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)){
  if(/^https?:/.test(match[1])) continue;
  if(!fs.existsSync(path.join(root, match[1]))) throw new Error(`Missing asset: ${match[1]}`);
}
console.log('All static assets exist.');
