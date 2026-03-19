import fs from 'fs';

const data = JSON.parse(fs.readFileSync('akshaya_data.json', 'utf8'));

// Sort by date and then try to infer sheet row from delivery_name if possible
// Otherwise just report what we have.
const report = data.map(d => {
  // Extract index from "Delivery_YYYY-MM-DD_INDEX"
  const match = d.delivery_name.match(/Delivery_.*_(\d+)$/);
  const sheetRow = match ? parseInt(match[1]) + 2 : 'UNKNOWN';
  
  return {
    sheetRow,
    date: d.date,
    photographer: d.assigned_user_id, // We'll need to map this to names
    footage: d.footage_link || 'EMPTY',
    reel: d.reel_link || 'EMPTY',
    name: d.delivery_name
  };
}).sort((a, b) => {
    if (a.sheetRow !== 'UNKNOWN' && b.sheetRow !== 'UNKNOWN') return a.sheetRow - b.sheetRow;
    return a.date.localeCompare(b.date);
});

fs.writeFileSync('verification_prep.json', JSON.stringify(report, null, 2));
console.log('Prepared verification data for 146 rows.');
