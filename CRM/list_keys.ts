import fs from 'fs';
const data = JSON.parse(fs.readFileSync('nandi_sheet_data.json', 'utf8'));
if (data.length > 0) {
  console.log('Keys in JSON:', Object.keys(data[0]));
} else {
  console.log('JSON is empty');
}
