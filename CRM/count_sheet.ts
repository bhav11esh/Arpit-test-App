import fs from 'fs';

const data = JSON.parse(fs.readFileSync('raw_sheet_dump.json', 'utf8'));
console.log(`Total Records in raw_sheet_dump.json: ${data.length}`);

const suspected = data.filter((r: any) => 
  (r["Customer Name"] && (r["Customer Name"].includes('Nisha') || r["Customer Name"].includes('Shehjar'))) ||
  r["Date"] === '12-03-2026' ||
  r["Date"] === '2026-03-12' ||
  r["Date"] === '12/03/2026'
);

console.log('Suspected records in JSON dump:');
console.table(suspected);

// Find ANY record on March 12th or any month 12
const march12 = data.filter((r: any) => r["Date"] && (r["Date"].includes('12-03') || r["Date"].includes('03-12')));
console.log('Record including 12-03 or 03-12 in Date:');
console.table(march12);
