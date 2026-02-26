const fs = require('fs');
const path = require('path');

const en = require('./src/i18n/en.json');
const enKeys = Object.keys(en);

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const files = walkDir(path.join(__dirname, 'src'));
const usedKeys = new Set();
const regex = /t\(['"`]([^'"`]+)['"`]\)/g;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    usedKeys.add(match[1]);
  }
});

const missing = Array.from(usedKeys).filter(k => !enKeys.includes(k)).sort();

console.log('Missing translation keys:');
missing.forEach(k => console.log(`  "${k}"`));
console.log(`\nTotal missing: ${missing.length}`);
