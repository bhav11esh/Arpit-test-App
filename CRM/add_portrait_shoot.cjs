const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

// Try both .env and .env.local
let envConfig = {};
if (fs.existsSync('.env')) {
  envConfig = { ...envConfig, ...dotenv.parse(fs.readFileSync('.env')) };
}
if (fs.existsSync('.env.local')) {
  envConfig = { ...envConfig, ...dotenv.parse(fs.readFileSync('.env.local')) };
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const serviceKey = envConfig.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in env files');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('--- ADDING PORTRAIT SHOOT DEALERSHIP ---');
  
  const name = 'Portrait Shoot';
  const syncUrl = 'https://script.google.com/macros/s/AKfycbx8qtmzZoRhF4wP8yMnHS8cQplxTN_yhzSzAwA0OWY76heH1KIBNN7AuY8osF9WupCbzg/exec';
  
  // 1. Check if it exists
  const { data: existing, error: checkError } = await supabase
    .from('dealerships')
    .select('*')
    .eq('name', name)
    .single();
    
  if (checkError && checkError.code !== 'PGRST116') {
     console.error('Error checking dealership:', checkError);
     return;
  }
  
  if (existing) {
    console.log(`Dealership '${name}' already exists (ID: ${existing.id}). Updating sync URL...`);
    const { error: updateError } = await supabase
      .from('dealerships')
      .update({ google_sync_url: syncUrl })
      .eq('id', existing.id);
      
    if (updateError) console.error('Update failed:', updateError);
    else console.log('Successfully updated.');
  } else {
    console.log(`Dealership '${name}' not found. Creating new record...`);
    // We might need a cluster_id or other fields. Let's see the schema.
    const { data: cols, error: schemaError } = await supabase.from('dealerships').select('*').limit(1);
    
    if (schemaError) {
      console.error('Failed to get schema:', schemaError);
      return;
    }
    
    const sample = cols[0] || {};
    const newRecord = {
      name: name,
      google_sync_url: syncUrl,
    };
    
    // Add default values if needed
    if ('active' in sample) newRecord.active = true;
    if ('city_id' in sample) newRecord.city_id = sample.city_id; // Inherit from random sample if needed, or ask
    
    const { data: inserted, error: insertError } = await supabase
      .from('dealerships')
      .insert(newRecord)
      .select();
      
    if (insertError) console.error('Insert failed:', insertError);
    else console.log('Successfully created:', inserted);
  }
}

run();
