const fs = require('fs');
if (!fs.existsSync('audit_pps_mahindra_results.json')) {
  console.log('Results file does not exist');
  return;
}
const results = JSON.parse(fs.readFileSync('audit_pps_mahindra_results.json', 'utf8'));
console.log('Total discrepancies in PPS Mahindra:', results.discrepancies.length);
results.discrepancies.forEach(d => {
  const isPhotogMismatch = d.errors.some(e => e.includes('Photographer mismatch'));
  if (isPhotogMismatch) {
    console.log(`Row ${d.row}: Sheet="${d.sheetDetails.photographer}" vs CRM="${d.crmDetails.photographer}"`);
  }
});
