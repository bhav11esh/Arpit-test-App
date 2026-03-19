import { defineConfig } from 'vite'
console.log('[ViteProxy] FILE: Loading vite.config.ts...');
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// V1 PROXY PLUGIN: Internal dev proxy for Supabase Admin Auth
// This runs in Node.js, so it can safely use the Service Role key.
function adminAuthProxy() {
  return {
    name: 'admin-auth-proxy',
    configureServer(server: any) {
      console.log('[ViteProxy] PLUGIN: Admin Auth Proxy Active');

      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || '';
        
        // Handle only /api/admin-auth
        if (!url.startsWith('/api/admin-auth')) {
          return next();
        }

        console.log(`[ViteProxy] EVENT: Caught ${req.method} ${url}`);

        // Health check
        if (req.method === 'GET' && url.includes('/ping')) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.end(JSON.stringify({ 
            status: 'alive', 
            time: new Date().toISOString(),
            info: 'Vite Admin Auth Proxy (Plugin Mode)'
          }));
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          return res.end();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        (async () => {
          try {
            const fs = await import('fs');
            const dotenv = await import('dotenv');
            
            let envConfig = {};
            if (fs.existsSync('.env')) {
              envConfig = { ...envConfig, ...dotenv.parse(fs.readFileSync('.env')) };
            }
            if (fs.existsSync('.env.local')) {
              envConfig = { ...envConfig, ...dotenv.parse(fs.readFileSync('.env.local')) };
            }

            const supabaseUrl = (envConfig as any).VITE_SUPABASE_URL;
            const serviceKey = (envConfig as any).VITE_SUPABASE_SERVICE_ROLE_KEY;
            const anonKey = (envConfig as any).VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !serviceKey) {
              throw new Error('Supabase configuration missing');
            }

            let bodyText = '';
            for await (const chunk of req) {
              bodyText += chunk;
            }
            
            if (!bodyText) throw new Error('Request body is empty');

            const { path: authPath, method: authMethod, body: authBody } = JSON.parse(bodyText);
            
            console.log(`[ViteProxy] ACTION: Forwarding to Supabase Admin -> ${authMethod} ${authPath}`);

            const response = await fetch(`${supabaseUrl}/auth/v1/admin${authPath}`, {
              method: authMethod,
              headers: {
                'Content-Type': 'application/json',
                'apikey': anonKey,
                'Authorization': `Bearer ${serviceKey}`
              },
              body: authBody ? JSON.stringify(authBody) : undefined
            });

            const resData = await response.json().catch(() => ({}));
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.statusCode = response.status;
            res.end(JSON.stringify(resData));
          } catch (err: any) {
            console.error('[ViteProxy] ERROR:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: err.message }));
          }
        })();
      });
    }
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    adminAuthProxy(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'CRM Geofence',
        short_name: 'CRM',
        description: 'CRM with Background Geofencing',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  }
})
