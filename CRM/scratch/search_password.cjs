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
      if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.md') || file.endsWith('.txt')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes(matchStr.toLowerCase()) && !fullPath.includes('node_modules')) {
            console.log(`Found "${matchStr}" in: ${fullPath}`);
            // print lines
            content.split('\n').forEach((line, idx) => {
              if (line.toLowerCase().includes(matchStr.toLowerCase())) {
                console.log(`  Line ${idx+1}: ${line.trim()}`);
              }
            });
          }
        } catch (e) {}
      }
    }
  }
}

console.log('Searching for password/secret...');
searchFiles('C:\\Users\\dell\\.gemini\\antigravity\\scratch\\Arpit-test-App', 'password');
searchFiles('C:\\Users\\dell\\.gemini\\antigravity\\scratch\\Arpit-test-App', 'postgres');
