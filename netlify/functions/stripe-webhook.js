/**
 * LocOutils — Webhook Stripe
 * URL à coller dans Stripe : https://locoutils37.netlify.app/.netlify/functions/stripe-webhook
 * Événement à écouter : checkout.session.completed
 *
 * ENV requis : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 * ENV optionnel : SUPABASE_URL
 *
 * Rôle :
 *  1. Paiement confirmé → insère la réservation dans Supabase
 *  2. La contrainte SQL anti double-booking protège contre les collisions.
 *     Si collision (2 paiements simultanés sur le même créneau) → remboursement
 *     automatique intégral du second client + log.
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let evt;
  try {
    evt = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Signature webhook invalide:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (evt.type === 'checkout.session.completed') {
    const s = evt.data.object;
    const m = s.metadata || {};

    if (!SB_SERVICE) {
      console.error('SUPABASE_SERVICE_ROLE_KEY manquante — réservation NON enregistrée:', s.id);
      return { statusCode: 200, body: 'ok (no db key)' };
    }

    const row = {
      tool_id: m.tool_id, tool_name: m.tool_name, duration: m.duration,
      date_start: m.date_start, date_end: m.date_end,
      customer_name: m.customer_name,
      customer_email: s.customer_details?.email || s.customer_email || '',
      customer_phone: m.customer_phone,
      amount_location: parseInt(m.amount_location||'0',10),
      amount_caution: parseInt(m.amount_caution||'0',10),
      stripe_session_id: s.id,
      status: 'confirmed', caution_status: 'held',
    };

    const ins = await fetch(`${SB_URL}/rest/v1/reservations`, {
      method: 'POST',
      headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, 'Content-Type':'application/json', Prefer:'return=minimal' },
      body: JSON.stringify(row),
    });

    if (ins.status === 409 || ins.status === 400) {
      const txt = await ins.text();
      if (txt.includes('no_double_booking') || txt.includes('23P01')) {
        // Collision rarissime : deux paiements simultanés → remboursement auto du second
        console.error('DOUBLE BOOKING détecté — remboursement auto:', s.id);
        try {
          await stripe.refunds.create({ payment_intent: s.payment_intent });
        } catch (e) { console.error('Échec remboursement auto:', e.message); }
        return { statusCode: 200, body: 'conflict refunded' };
      }
      if (txt.includes('duplicate key') && txt.includes('stripe_session_id')) {
        return { statusCode: 200, body: 'already recorded' }; // retry Stripe idempotent
      }
      console.error('Erreur insertion Supabase:', ins.status, txt);
      return { statusCode: 500, body: 'db error' }; // Stripe retentera
    }
    if (!ins.ok) {
      console.error('Erreur insertion Supabase:', ins.status, await ins.text());
      return { statusCode: 500, body: 'db error' };
    }
    console.log('Réservation enregistrée:', s.id, m.tool_id, m.date_start, '→', m.date_end);
  }

  return { statusCode: 200, body: 'ok' };
};
