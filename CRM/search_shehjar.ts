import fs from 'fs';

const data = JSON.parse(fs.readFileSync('nandi_sheet_data.json', 'utf8'));

// Find any record including Shehjar or Nisha
const targets = data.filter((r: any) => 
  (r["Customer Name"] && (r["Customer Name"].includes('Shehjar') || r["Customer Name"].includes('Nisha'))) ||
  (r["Customer name"] && (r["Customer name"].includes('Shehjar') || r["Customer name"].includes('Nisha')))
);

console.log('Target records in fetched sheet data:');
console.log(JSON.stringify(targets, null, 2));
