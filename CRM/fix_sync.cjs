const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const triggerSql = `
CREATE OR REPLACE FUNCTION public.handle_delivery_reel_link_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if reel_link has changed
    IF (OLD.reel_link IS DISTINCT FROM NEW.reel_link) THEN
        UPDATE public.reel_tasks
        SET 
            reel_link = NEW.reel_link,
            status = CASE WHEN NEW.reel_link IS NOT NULL AND NEW.reel_link != '' THEN 'RESOLVED' ELSE 'PENDING' END
        WHERE delivery_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_delivery_reel_link_update ON public.deliveries;

CREATE TRIGGER trg_delivery_reel_link_update
AFTER UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.handle_delivery_reel_link_update();
  `;

  const backfillSql = `
UPDATE public.reel_tasks rt
SET 
    reel_link = d.reel_link,
    status = CASE WHEN d.reel_link IS NOT NULL AND d.reel_link != '' THEN 'RESOLVED' ELSE 'PENDING' END
FROM public.deliveries d
WHERE rt.delivery_id = d.id
  AND (rt.reel_link IS DISTINCT FROM d.reel_link OR (d.reel_link IS NOT NULL AND d.reel_link != '' AND rt.status != 'RESOLVED'));
  `;

  const postItFixSql = `
UPDATE public.reel_tasks
SET is_post_it = false
WHERE status = 'RESOLVED' AND is_post_it = true;
  `;

  console.log('Running trigger setup...');
  let res1 = await supabase.rpc('exec_sql', { sql_query: triggerSql });
  console.log(res1);

  console.log('Running backfill...');
  let res2 = await supabase.rpc('exec_sql', { sql_query: backfillSql });
  console.log(res2);
  
  console.log('Running post it cleanup...');
  let res3 = await supabase.rpc('exec_sql', { sql_query: postItFixSql });
  console.log(res3);
}

run().catch(console.error);
