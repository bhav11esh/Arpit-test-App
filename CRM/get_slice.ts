import fs from 'fs';

const data = JSON.parse(fs.readFileSync('nandi_sheet_data.json', 'utf8'));
console.log('Rows 385 to 398:');
console.log(JSON.stringify(data.slice(385, 398), null, 2));
console.log(`\nTotal rows in JSON: ${data.length}`);
