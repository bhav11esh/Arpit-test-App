const fs = require('fs');
const path = require('path');

function searchFiles(dir, filter, onMatch) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchFiles(fullPath, filter, onMatch);
      }
    } else {
      if (filter(file)) {
        onMatch(fullPath);
      }
    }
  }
}

console.log('Searching for env files...');
searchFiles('C:\\Users\\dell\\.gemini\\antigravity\\scratch\\Arpit-test-App', 
  (name) => name.toLowerCase().includes('env') || name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.ts'),
  (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('VITE_SUPABASE_URL') && !filePath.includes('node_modules')) {
        console.log('Found in:', filePath);
      }
    } catch (e) {}
  }
);
