/**
 * LocOutils — Stripe Checkout + vérification disponibilité Supabase
 * ENV requis : STRIPE_SECRET_KEY, SITE_URL
 * ENV optionnels : SUPABASE_URL, SUPABASE_ANON_KEY (valeurs publiques par défaut)
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const SITE = process.env.SITE_URL || 'https://locoutils37.netlify.app';
const SB_URL = process.env.SUPABASE_URL;
const SB_ANON = process.env.SUPABASE_ANON_KEY;

const CATALOG = {
  'perceuse-hitachi':{name:'Perceuse visseuse Hitachi 18V',prices:{demi:500,jour:900,we:1600,semaine:2700},caution:6000},
  'perfo-makita':{name:'Perforateur SDS Makita HR2470',prices:{demi:800,jour:1500,we:2600,semaine:4500},caution:10000},
  'perfo-worx':{name:'Perforateur SDS Worx',prices:{demi:700,jour:1200,we:2000,semaine:3600},caution:8000},
  'scie-onglets':{name:'Scie à onglets Evolution',prices:{demi:1000,jour:1800,we:3000,semaine:5400},caution:12000},
  'scie-sauteuse':{name:'Scie sauteuse Makita',prices:{demi:500,jour:900,we:1600,semaine:2700},caution:5000},
  'scie-sabre':{name:'Scie sabre AEG',prices:{demi:600,jour:1000,we:1800,semaine:3000},caution:6000},
  'scies-cloches':{name:'Kit scies cloches bimétal',prices:{demi:400,jour:600,we:1000,semaine:1800},caution:3000},
  'ponceuse-bosch':{name:'Ponceuse excentrique Bosch PEX 300 AE',prices:{demi:500,jour:800,we:1400,semaine:2400},caution:5000},
  'ponceuse-bande':{name:'Ponceuse à bande',prices:{demi:500,jour:800,we:1400,semaine:2400},caution:5000},
  'rabot-bosch':{name:'Rabot électrique Bosch',prices:{demi:500,jour:800,we:1400,semaine:2400},caution:5000},
  'defonceuse':{name:'Défonceuse Ryobi 1500W',prices:{demi:800,jour:1500,we:2600,semaine:4500},caution:10000},
  'multi-fein':{name:'Outil multifonction Fein',prices:{demi:700,jour:1200,we:2000,semaine:3600},caution:8000},
  'compresseur':{name:'Compresseur Mecafer Twenty 24L',prices:{demi:1000,jour:1800,we:3000,semaine:5400},caution:12000},
  'poste-souder':{name:'Poste à souder',prices:{demi:1000,jour:1800,we:3000,semaine:5400},caution:10000},
  'meuleuse':{name:"Meuleuse d'angle Titan 115mm",prices:{demi:500,jour:800,we:1400,semaine:2400},caution:5000},
  'karcher':{name:'Aspirateur Kärcher WD 6 P 30L',prices:{demi:800,jour:1400,we:2400,semaine:4200},caution:10000},
  'etau':{name:"Étau d'établi",prices:{demi:300,jour:400,we:700,semaine:1200},caution:3000},
  'serre-joints':{name:'Serre-joints (x5)',prices:{demi:300,jour:400,we:700,semaine:1200},caution:3000},
  'cles':{name:'Jeu de clés mixtes',prices:{demi:200,jour:300,we:500,semaine:900},caution:2000},
  'devidoir':{name:'Dévidoir électrique 4 prises',prices:{demi:200,jour:300,we:500,semaine:900},caution:2000},
  'robot-klarstein':{name:'Robot pâtissier Klarstein',prices:{demi:600,jour:1000,we:1800,semaine:3000},caution:5000},
  'clavier-casio':{name:'Clavier Casio WK-1800 76 touches',prices:{demi:600,jour:1000,we:1800,semaine:3000},caution:6000},
};
const DUR_DAYS = { demi:0, jour:1, we:3, semaine:7 };
const DUR_LABELS = { demi:'Demi-journée (4h)', jour:'Journée (24h)', we:'Week-end (3j)', semaine:'Semaine (7j)' };

function addDays(iso, n){ const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers:cors(), body:'' };
  if (event.httpMethod !== 'POST') return res(405,{error:'POST only'});
  try {
    const { toolId, duration, dateISO, name, email, phone } = JSON.parse(event.body||'{}');
    if (!toolId||!duration||!dateISO||!name||!email||!phone) return res(400,{error:'Champs manquants'});
    const tool = CATALOG[toolId]; if(!tool) return res(400,{error:'Outil inconnu'});
    const locPrice = tool.prices[duration]; if(!locPrice) return res(400,{error:'Durée invalide'});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return res(400,{error:'Date invalide'});

    const dateStart = dateISO;
    const dateEnd = addDays(dateISO, DUR_DAYS[duration]);

    const q = `${SB_URL}/rest/v1/public_availability?tool_id=eq.${encodeURIComponent(toolId)}&date_start=lte.${dateEnd}&date_end=gte.${dateStart}&select=tool_id`;
    const avail = await fetch(q, { headers:{ apikey:SB_ANON, Authorization:`Bearer ${SB_ANON}` } });
    if (avail.ok) {
      const rows = await avail.json();
      if (rows.length > 0) return res(409,{error:'Ce créneau vient d\'être réservé pour cet outil. Choisissez d\'autres dates.'});
    }

    const dateFR = new Date(dateISO+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const session = await stripe.checkout.sessions.create({
      mode:'payment',
      customer_email: email,
      line_items:[
        { price_data:{ currency:'eur', product_data:{ name:`Location — ${tool.name}`, description:`${DUR_LABELS[duration]} · Retrait le ${dateFR}` }, unit_amount: locPrice }, quantity:1 },
        { price_data:{ currency:'eur', product_data:{ name:`Caution — ${tool.name}`, description:'Remboursée intégralement au retour en bon état (2-5 jours ouvrés)' }, unit_amount: tool.caution }, quantity:1 },
      ],
      metadata:{
        tool_id: toolId, tool_name: tool.name, duration,
        date_start: dateStart, date_end: dateEnd,
        customer_name: name, customer_phone: phone,
        amount_location: String(locPrice), amount_caution: String(tool.caution),
      },
      success_url: `${SITE}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/catalogue/`,
    });
    return res(200,{ url: session.url });
  } catch (err) {
    console.error('create-checkout error:', err);
    return res(500,{error: err.message});
  }
};
function cors(){return{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};}
function res(c,b){return{statusCode:c,headers:{...cors(),'Content-Type':'application/json'},body:JSON.stringify(b)};}
