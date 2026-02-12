const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhotographerMappings() {
    try {
        // 1. Find Mallikarjun, Aman, Sahith IDs
        const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('id, name, email');

        if (userError) throw userError;

        const targetUsers = users.filter(u =>
            u.name.includes('Mallikarjun') ||
            u.name.includes('Aman') ||
            u.name.includes('Sahith') ||
            u.email === 'pavanmanne735@gmail.com'
        );

        console.log('--- TARGET USERS ---');
        targetUsers.forEach(u => console.log(`${u.name} (${u.email}): ${u.id}`));

        const ids = targetUsers.map(u => u.id);

        // 2. Get Mappings for these users
        const { data: mappings, error: mapError } = await supabase
            .from('mappings')
            .select('*, dealerships(name), clusters(name)')
            .in('photographer_id', ids);

        if (mapError) throw mapError;

        console.log('\n--- MAPPINGS ---');
        mappings.forEach(m => {
            const userName = targetUsers.find(u => u.id === m.photographer_id)?.name;
            console.log(`User: ${userName} | Showroom: ${m.dealerships?.name} | Type: ${m.mapping_type} | Cluster: ${m.clusters?.name}`);
        });

        // 3. Get all mappings for PPS Mahindra and Khivraj Triumph specifically
        const { data: dealerships } = await supabase
            .from('dealerships')
            .select('id, name')
            .or('name.ilike.%PPS Mahindra%,name.ilike.%Khivraj Triumph%');

        const dIds = dealerships.map(d => d.id);
        const { data: dMappings } = await supabase
            .from('mappings')
            .select('*, profiles(name), clusters(name)')
            .in('dealership_id', dIds);

        console.log('\n--- TARGET SHOWROOM MAPPINGS ---');
        dMappings.forEach(m => {
            console.log(`Showroom: ${dealerships.find(d => d.id === m.dealership_id)?.name} | Photographer: ${m.profiles?.name} | Type: ${m.mapping_type} | Cluster: ${m.clusters?.name}`);
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

checkPhotographerMappings();
