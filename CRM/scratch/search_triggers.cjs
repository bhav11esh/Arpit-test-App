const fs = require('fs');
const path = require('path');

function searchTriggers(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchTriggers(fullPath);
      }
    } else if (file.endsWith('.sql')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toLowerCase().includes('trigger')) {
          console.log(`File: ${fullPath}`);
          content.split('\n').forEach((line, idx) => {
            if (line.toLowerCase().includes('trigger') || line.toLowerCase().includes('function')) {
              console.log(`  Line ${idx+1}: ${line.trim()}`);
            }
          });
        }
      } catch (e) {}
    }
  }
}

console.log('Searching for triggers in SQL files...');
searchTriggers('C:\\Users\\dell\\.gemini\\antigravity\\scratch\\Arpit-test-App');
