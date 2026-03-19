const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('--- CORRECTED COORDINATE AUDIT ---');

  // 1. Fetch all dealerships
  const { data: dealerships } = await supabase.from('dealerships').select('id, name, latitude, longitude');
  
  // 2. Fetch all mappings
  const { data: mappings } = await supabase.from('mappings').select('dealership_id, latitude, longitude');

  const missingList = [];

  dealerships.forEach(d => {
    // Check if any mapping for this dealership has valid coords
    const dealerMappings = mappings.filter(m => m.dealership_id === d.id);
    const hasValidMapping = dealerMappings.some(m => m.latitude && m.longitude && m.latitude !== 0);
    
    // Check if dealership itself has valid coords
    const hasValidDealerCoord = d.latitude && d.longitude && d.latitude !== 0;

    if (!hasValidMapping && !hasValidDealerCoord) {
      missingList.push(d);
    }
  });

  console.log('--- SHOWROOMS TRULY MISSING COORDS (Neither in Dealer nor Mappings) ---');
  missingList.forEach(m => {
    console.log(`- ${m.name} (id: ${m.id})`);
  });
  console.log(`Total: ${missingList.length} truly missing.`);
}

check();
