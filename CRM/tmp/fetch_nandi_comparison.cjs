
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchData() {
    // 1. Get Dealership info (to get sheet ID)
    const { data: dealership } = await supabase
        .from('dealerships')
        .select('*')
        .eq('name', 'Nandi toyota')
        .single();
    
    console.log('Dealership Sheet ID:', dealership.google_sheet_id);

    // 2. Get all deliveries from CRM
    const { data: crmDeliveries } = await supabase
        .from('deliveries')
        .select('*')
        .eq('showroom_code', 'NANDI_TOYOTA')
        .order('date', { ascending: false });
    
    // 3. Get all users for name resolution
    const { data: users } = await supabase.from('users').select('id, name');
    const userMap = users.reduce((acc, u) => {
        acc[u.id] = u.name;
        return acc;
    }, {});

    const crmDataSimplified = crmDeliveries.map(d => ({
        id: d.id,
        date: d.date,
        photographer: userMap[d.assigned_user_id] || 'Unknown',
        footage_link: d.footage_link || '',
        reel_link: d.reel_link || (d.metadata && d.metadata.reel_link) || ''
    }));

    fs.writeFileSync('tmp/crm_data_nandi.json', JSON.stringify(crmDataSimplified, null, 2));
    fs.writeFileSync('tmp/nandi_sheet_id.txt', dealership.google_sheet_id);
    
    console.log(`Fetched ${crmDataSimplified.length} records from CRM.`);
}

fetchData();
