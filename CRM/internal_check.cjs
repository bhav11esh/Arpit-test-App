const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amikduuczgnirbnzuvtc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaWtkdXVjemduaXJibnp1dnRjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQ1NDI1MiwiZXhwIjoyMDg1MDMwMjUyfQ.klHXYwI6Bz3UgwWINpWjwf0CsYN0CZu2cHIVfQRewZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: m } = await supabase.from('mappings').select('*');
    const { data: p } = await supabase.from('profiles').select('*');
    const { data: d } = await supabase.from('dealerships').select('*');

    const pps = d.find(x => x.name.includes('PPS Mahindra'));
    const mpps = m.find(x => x.dealership_id === pps.id);
    const clusterId = mpps.cluster_id;

    const mal = p.find(x => x.name.includes('Mallikarjun'));

    const members = m.filter(x => x.cluster_id === clusterId).map(x => x.photographer_id);
    const uniqueMembers = [...new Set(members)];

    const names = p.filter(x => uniqueMembers.includes(x.id)).map(x => x.name);

    console.log('Cluster Members for PPS Mahindra/Khivraj Triumph:');
    names.forEach(n => {
        if (n !== mal.name) console.log(' - ' + n);
    });
}

run();
