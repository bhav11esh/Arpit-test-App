
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyImport() {
  console.log('--- STARTING IMPORT VERIFICATION ---');
  
  // 1. Get all users for name resolution
  const { data: users } = await supabase.from('users').select('id, name');
  const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

  // 2. Query deliveries for Nandi Toyota
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('showroom_code', 'NANDI_TOYOTA')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching deliveries:', error);
    return;
  }

  console.log(`Total records found for NANDI_TOYOTA: ${deliveries.length}`);

  // 3. Detailed Integrity Check
  const stats = {
    total: deliveries.length,
    missingFootage: 0,
    missingReel: 0,
    missingPhotog: 0,
    dateSamples: []
  };

  deliveries.forEach((d, i) => {
    if (!d.footage_link) stats.missingFootage++;
    if (!d.reel_link) stats.missingReel++; // Assuming field name is reel_link or in metadata
    if (!d.assigned_user_id) stats.missingPhotog++;
    
    // Check for photographer name resolution
    const photogName = userMap[d.assigned_user_id] || 'Unknown';
    
    if (i < 5 || i > deliveries.length - 6) {
      stats.dateSamples.push({
        date: d.date,
        photog: photogName,
        footage: d.footage_link ? 'OK' : 'MISSING',
        reel: d.reel_link ? 'OK' : 'MISSING'
      });
    }
  });

  console.log('Integrity Summary:', JSON.stringify(stats, null, 2));
  
  // Also check metadata if reel_link is stored there
  const sample = deliveries[0];
  console.log('Sample Record:', JSON.stringify(sample, null, 2));
}

verifyImport();
