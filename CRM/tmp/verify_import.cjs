
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyImport() {
  let output = '--- STARTING IMPORT VERIFICATION (PURE JS) ---\n';
  
  // 1. Get all users for name resolution
  const { data: users } = await supabase.from('users').select('id, name');
  const userMap = users.reduce((acc, u) => {
    acc[u.id] = u.name;
    return acc;
  }, {});

  // 2. Query deliveries for Nandi Toyota
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('showroom_code', 'NANDI_TOYOTA')
    .order('date', { ascending: false });

  if (error) {
    output += `Error fetching deliveries: ${error}\n`;
    fs.writeFileSync('tmp/audit_result_final.txt', output);
    return;
  }

  output += `Total records found for NANDI_TOYOTA: ${deliveries.length}\n`;

  // 3. Detailed Integrity Check
  const stats = {
    total: deliveries.length,
    missingFootage: 0,
    missingReel: 0,
    missingPhotog: 0,
    photographerCounts: {},
    dateRange: { min: null, max: null }
  };

  const sampleRows = [];

  deliveries.forEach((d, i) => {
    if (!d.footage_link) stats.missingFootage++;
    
    // Check reel_link in the main column or in metadata
    const reelLink = d.reel_link || (d.metadata && d.metadata.reel_link) || '';
    if (!reelLink) stats.missingReel++;
    
    if (!d.assigned_user_id) {
      stats.missingPhotog++;
    } else {
      const photogName = userMap[d.assigned_user_id] || 'Unknown';
      stats.photographerCounts[photogName] = (stats.photographerCounts[photogName] || 0) + 1;
    }
    
    // Date range
    if (!stats.dateRange.min || d.date < stats.dateRange.min) stats.dateRange.min = d.date;
    if (!stats.dateRange.max || d.date > stats.dateRange.max) stats.dateRange.max = d.date;
    
    // Sample rows for user review
    if (i < 5 || i > deliveries.length - 6) {
      sampleRows.push({
        index: i + 1,
        date: d.date,
        photog: userMap[d.assigned_user_id] || 'Unassigned',
        footage: d.footage_link ? (d.footage_link.substring(0, 30) + '...') : 'MISSING',
        reel: d.reel_link ? (d.reel_link.substring(0, 30) + '...') : (d.metadata && d.metadata.reel_link ? 'IN METADATA' : 'MISSING')
      });
    }
  });

  output += '\n--- INTEGRITY SUMMARY ---\n';
  output += `Total Count: ${stats.total}\n`;
  output += `Date Range: ${stats.dateRange.min} to ${stats.dateRange.max}\n`;
  output += `Missing Footage: ${stats.missingFootage}\n`;
  output += `Missing Reel: ${stats.missingReel}\n`;
  output += `Missing Photog: ${stats.missingPhotog}\n`;
  output += `\nPhotographer Breakdown: ${JSON.stringify(stats.photographerCounts, null, 2)}\n`;
  output += `\nSample Rows (Top/Bottom):\n${JSON.stringify(sampleRows, null, 2)}\n`;

  fs.writeFileSync('tmp/audit_result_final.txt', output);
  console.log('Audit complete. Results in tmp/audit_result_final.txt');
}

verifyImport();
