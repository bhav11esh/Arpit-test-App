const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: dealerships, error } = await supabase.from('dealerships').select('id, name, latitude, longitude');
  if (error) {
    console.error(error);
    return;
  }
  
  const incomplete = dealerships.filter(d => 
    !d.latitude || !d.longitude || d.latitude === 0 || d.longitude === 0
  );
  
  console.log('--- SHOWROOMS MISSING COORDS ---');
  incomplete.forEach(d => {
    console.log(`- ${d.name} (id: ${d.id}) [Lat: ${d.latitude}, Lng: ${d.longitude}]`);
  });
  console.log(`Total: ${incomplete.length} found.`);
}

check();
