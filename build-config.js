// Génère config.js au build depuis les variables d'environnement Netlify.
// La clé anon Supabase est PUBLIQUE (destinée au navigateur), mais on la garde
// hors du code source pour satisfaire le secret-scanning de Netlify.
const fs = require('fs');
const url = process.env.SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON_KEY || '';
const out = `window.LOCOUTILS_CONFIG = ${JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: anon })};\n`;
fs.writeFileSync('config.js', out);
console.log('config.js généré' + (url && anon ? ' avec les clés Supabase.' : ' (VIDE — variables SUPABASE_URL / SUPABASE_ANON_KEY manquantes dans Netlify).'));
