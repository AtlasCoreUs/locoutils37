const fs=require('fs');const path=require('path');
const config={stripePublicKey:process.env.STRIPE_PUBLIC_KEY||'',supabaseUrl:process.env.SUPABASE_URL||'',supabaseAnonKey:process.env.SUPABASE_ANON_KEY||'',siteUrl:process.env.SITE_URL||'https://locoutils37final.netlify.app'};
const out=`window.LOCOUTILS_CONFIG=${JSON.stringify(config)};\n`;fs.mkdirSync(path.join(__dirname,'assets/js'),{recursive:true});fs.writeFileSync(path.join(__dirname,'assets/js/config.js'),out);console.log('Public config generated.');
