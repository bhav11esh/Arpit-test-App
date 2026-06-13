const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(dir);
for (const file of files) {
  if (file.endsWith('.sql')) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    if (content.includes('exec_sql')) {
      console.log(`Found exec_sql in: ${file}`);
    }
  }
}
