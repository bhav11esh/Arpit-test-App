const fs = require('fs');
const path = require('path');

function searchSyncUI(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        searchSyncUI(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.cjs')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toLowerCase().includes('google_sync_url') || content.toLowerCase().includes('sync_url') || content.toLowerCase().includes('syncnow') || content.toLowerCase().includes('trigger_sync') || content.toLowerCase().includes('sync_bridge')) {
          console.log(`Sync-related UI file: ${fullPath}`);
        }
      } catch (e) {}
    }
  }
}

console.log('Searching for sync operations in UI...');
searchSyncUI('C:\\Users\\dell\\.gemini\\antigravity\\scratch\\Arpit-test-App\\CRM\\src');
