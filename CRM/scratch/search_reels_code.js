const fs = require('fs');
const path = require('path');

function searchFiles(dir, matchStr) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchFiles(fullPath, matchStr);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.gs')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(matchStr)) {
            console.log(`Found "${matchStr}" in: ${fullPath}`);
          }
        } catch (e) {}
      }
    }
  }
}

console.log('Searching for "reel_tasks"...');
searchFiles('C:\\Users\\dell\\.gemini\\antigravity\\scratch\\Arpit-test-App', 'reel_tasks');
