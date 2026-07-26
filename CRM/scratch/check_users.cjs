const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
  // Query Sathick user
  const { data: sathickUsers } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%Sathick%');
  console.log('Sathick users:', sathickUsers);

  // Query user 4247126e-71f1-4472-98a0-544219a597b9
  const { data: user1 } = await supabase
    .from('users')
    .select('*')
    .eq('id', '4247126e-71f1-4472-98a0-544219a597b9')
    .maybeSingle();
  console.log('User 4247126e-71f1-4472-98a0-544219a597b9 (assigned to 5 deliveries):', user1);

  // Query user 71704079-655e-43f3-8f52-86f2efe2cdca
  const { data: user2 } = await supabase
    .from('users')
    .select('*')
    .eq('id', '71704079-655e-43f3-8f52-86f2efe2cdca')
    .maybeSingle();
  console.log('User 71704079-655e-43f3-8f52-86f2efe2cdca (assigned to 1 delivery):', user2);

  // Query reel tasks for Skoda Karr delivery IDs specifically
  const skodaDeliveryIds = [
    'c1e8acde-cf76-498d-90ec-c4cf981624bd',
    'a1e51c25-4d43-46f8-8f17-4cb324f70e56',
    '4014fa78-723f-4a1b-8eda-32b9ae837155',
    'b1689db2-9455-435f-ac7d-b1b9677241e5',
    '7c61fa40-ef14-446d-be2b-38d63002d6cc',
    '2ad827c5-479b-409e-8587-faea2919647d'
  ];
  const { data: tasks } = await supabase
    .from('reel_tasks')
    .select('*')
    .in('delivery_id', skodaDeliveryIds);
  console.log('Reel tasks for these 6 Skoda Karr deliveries:', tasks);
}

checkUsers();
