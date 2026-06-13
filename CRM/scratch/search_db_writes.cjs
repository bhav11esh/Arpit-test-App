const fs = require('fs');
const path = require('path');

function searchWrites(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchWrites(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.gs')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('deliveries') && (content.includes('insert') || content.includes('update') || content.includes('upsert') || content.includes('write'))) {
          console.log(`File writing to deliveries: ${fullPath}`);
        }
      } catch (e) {}
    }
  }
}

console.log('Searching for deliveries write/update operations...');
searchWrites('C:\\Users\\dell\\.gemini\\antigravity\\scratch\\Arpit-test-App');
