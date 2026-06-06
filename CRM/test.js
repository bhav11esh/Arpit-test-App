import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const client = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching screenshots for Sahil...");
  const { data: users } = await client.from('users').select('*').ilike('name', '%Sahil Tamang%');
  if (!users || users.length === 0) return console.log("User not found");
  const user = users[0];
  console.log("User ID:", user.id);

  const { data: screenshots } = await client.from('screenshots')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'FRAUD_DETECTION')
    .order('uploaded_at', { ascending: false })
    .limit(5);
  
  console.log("Recent Fraud Screenshots:");
  screenshots.forEach(s => console.log(`ID: ${s.id}, Showroom: ${s.showroom_code}, Uploaded: ${s.uploaded_at}`));

  const targetScreenshot = screenshots[0]; // Assuming it's the latest one
  if (!targetScreenshot) return console.log("No screenshot found");

  const targetDate = targetScreenshot.uploaded_at.split('T')[0]; // Simple logic
  console.log("\nFetching deliveries for Sahil on", targetDate, "with showroom", targetScreenshot.showroom_code);

  const { data: deliveries } = await client.from('deliveries')
    .select('*')
    .eq('assigned_user_id', user.id)
    .eq('date', targetDate);
  
  console.log(`Found ${deliveries?.length} deliveries for that date.`);
  
  deliveries?.forEach(d => {
    console.log(`- Delivery ID: ${d.id}, Showroom: ${d.showroom_code}, Status: ${d.status}, Payment: ${d.payment_type}`);
    console.log(`  Match Showroom: ${d.showroom_code === targetScreenshot.showroom_code}`);
    console.log(`  Match Payment: ${d.payment_type === 'CUSTOMER_PAID'}`);
    console.log(`  Match Status: ${d.status === 'DONE'}`);
  });
}
run();
