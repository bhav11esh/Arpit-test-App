
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey!);

async function simulate() {
    // 1. Get photogs like ConfigContext does
    const { data: photographers } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'PHOTOGRAPHER')
        .eq('active', true);

    // 2. Get admin like AuthContext does
    const { data: admin } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'arpitmudgal24@gmail.com')
        .single();

    console.log(`Admin (${admin.name}) city: '${admin.city}'`);
    console.log(`Total active photographers in DB: ${photographers?.length}`);

    const filtered = admin.city 
        ? photographers?.filter(p => p.city === admin.city)
        : photographers;

    console.log(`Filtered photographers (visible to admin): ${filtered?.length}`);
    
    const manu = photographers?.find(p => p.name.includes('Manu'));
    if (manu) {
        console.log(`Manu Edayan found in photographers: YES`);
        console.log(`Manu city: '${manu.city}'`);
        console.log(`Match with admin city: ${manu.city === admin.city}`);
    } else {
        console.log(`Manu Edayan found in photographers: NO (Search: the list only has: ${photographers?.map(p => p.name).join(', ')})`);
    }
}

simulate();
