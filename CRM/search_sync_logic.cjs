const fs = require('fs');
const path = require('path');

function searchSyncLogic() {
  const dir = 'CRM';
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    if (file.startsWith('fetch_') && (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.cjs'))) {
      const fullPath = path.join(dir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('supabase') && (content.includes('insert') || content.includes('update') || content.includes('upsert'))) {
        console.log(`\n=========================================`);
        console.log(`Found database write in: ${fullPath}`);
        console.log(`=========================================`);
        // Print lines containing supabase.from
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('supabase.from') || line.includes('insert') || line.includes('update')) {
            console.log(`Line ${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

searchSyncLogic();
