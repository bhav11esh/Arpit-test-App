const fs = require('fs');
const path = require('path');

function searchLeavesMigrations() {
  const dir = 'supabase/migrations';
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    if (content.includes('leaves')) {
      console.log(`\n=========================================`);
      console.log(`Found leaves reference in: ${file}`);
      console.log(`=========================================`);
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('POLICY') || line.includes('policy') || line.includes('RLS') || line.includes('security')) {
          console.log(`Line ${index + 1}: ${line.trim()}`);
        }
      });
    }
  });
}

searchLeavesMigrations();
