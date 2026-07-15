const fs=require('fs');const path=require('path');const crypto=require('crypto');
let cache;
function tools(){if(!cache){const p=path.resolve(__dirname,'../../data/tools.json');cache=JSON.parse(fs.readFileSync(p,'utf8'));}return cache}
function toolById(id){return tools().find(t=>t.id===id)}
function site(){return (process.env.SITE_URL||'https://locoutils37final.netlify.app').replace(/\/$/,'')}
function allowedOrigins(){return new Set([site(),'http://localhost:8888','http://localhost:4173','http://127.0.0.1:4173'])}
function cors(origin=''){const o=allowedOrigins().has(origin)?origin:site();return{'Access-Control-Allow-Origin':o,'Access-Control-Allow-Headers':'Content-Type, Authorization, Stripe-Signature','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'}}
function json(status,body,origin=''){return{statusCode:status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(body)}}
function body(event){try{return JSON.parse(event.body||'{}')}catch{return null}}
function requireEnv(...names){const missing=names.filter(n=>!process.env[n]);if(missing.length)throw new Error(`Missing environment variables: ${missing.join(', ')}`)}
function addDays(iso,n){const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
const durations={demi:{days:0,label:'Demi-journée (4 h)'},jour:{days:1,label:'Journée (24 h)'},we:{days:3,label:'Week-end (3 jours)'},semaine:{days:7,label:'Semaine (7 jours)'}};
function validEmail(v){return typeof v==='string'&&v.length<=180&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validPhone(v){return typeof v==='string'&&v.length<=25&&/^[0-9+ .()\-]{8,25}$/.test(v)}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(`${v}T12:00:00Z`))}
function safeEq(a,b){const aa=Buffer.from(a||''),bb=Buffer.from(b||'');return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function admin(event){const auth=event.headers.authorization||event.headers.Authorization||'';const token=auth.startsWith('Bearer ')?auth.slice(7):'';return process.env.ADMIN_TOKEN&&safeEq(token,process.env.ADMIN_TOKEN)}
async function sb(pathname,{method='GET',body:payload,service=true,headers={}}={}){requireEnv('SUPABASE_URL',service?'SUPABASE_SERVICE_ROLE_KEY':'SUPABASE_ANON_KEY');const key=service?process.env.SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_ANON_KEY;const r=await fetch(`${process.env.SUPABASE_URL.replace(/\/$/,'')}/rest/v1/${pathname}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...headers},body:payload===undefined?undefined:JSON.stringify(payload)});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok){const e=new Error('Database operation failed');e.status=r.status;e.detail=data;throw e}return{data,headers:r.headers,status:r.status}}
module.exports={tools,toolById,site,cors,json,body,requireEnv,addDays,durations,validEmail,validPhone,validDate,admin,sb};
