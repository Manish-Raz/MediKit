// replace.js - recursive replacement of branding strings
const fs = require('fs');
const path = require('path');
const exts = ['.js', '.html', '.css', '.md', '.json', '.env', '.env.example'];
function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content
    .replace(/MediKit/g, 'MediKit')
    .replace(/medikit/g, 'medikit');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Updated', filePath);
  }
}
function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip node_modules and .git etc
      if (['node_modules', '.git'].includes(entry.name)) return;
      walk(full);
    } else if (exts.includes(path.extname(entry.name))) {
      replaceInFile(full);
    }
  });
}
const root = path.resolve(__dirname);
walk(root);
console.log('Replacement complete.');
