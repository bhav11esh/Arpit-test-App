import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function fixData() {
  console.log('🚀 Starting Data Fix...');

  // 1. Fix Apple Auto VW Spreadsheet ID typo
  const correctVwId = '15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZlA';
  const { error: vwError } = await supabase
    .from('dealerships')
    .update({ google_sheet_id: correctVwId })
    .ilike('name', '%Apple Auto%');

  if (vwError) console.error('❌ Failed to fix Apple Auto VW ID:', vwError);
  else console.log('✅ Apple Auto VW Spreadsheet ID fixed!');

  // 2. Fix Nandi Toyota March 12th Names
  // Matches based on the reel links found in previous audit
  const updates = [
    { 
      reel: 'https://drive.google.com/drive/folders/17fG8Dh6mBK19nF6p7Z_x84mKwGLCfSiE', 
      name: 'Shehjar Kaul Sahoo' 
    },
    { 
      reel: 'https://drive.google.com/drive/folders/1Qi8ERgZvXBK3NkEdiDiy2qmeJs3T5f0j', 
      name: 'Nisha Manjunath' 
    }
  ];

  for (const item of updates) {
    const { data, error } = await supabase
      .from('deliveries')
      .update({ delivery_name: item.name })
      .eq('reel_link', item.reel);

    if (error) console.error(`❌ Failed to update ${item.name}:`, error);
    else console.log(`✅ Updated record for ${item.name}`);
  }

  console.log('🎉 Data Fix Complete!');
}

fixData();
