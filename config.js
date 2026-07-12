/* ─────────────────────────────────────────────────────────────
   CONFIG SUPABASE (clé publique, sûre côté navigateur)

   • DÉPLOIEMENT GITHUB / BUILD NETLIFY : ce fichier est RÉÉCRIT
     automatiquement au build par build-config.js à partir des
     variables SUPABASE_URL et SUPABASE_ANON_KEY. Tu n'as rien à faire.

   • DÉPLOIEMENT GLISSER-DÉPOSER (sans build) : remplace les deux
     valeurs ci-dessous par les tiennes (dashboard Supabase → Project
     Settings → API : "Project URL" et "anon public"). Puis re-déploie.
     Sans ça, le calendrier n'affichera pas les dates déjà réservées
     (le paiement Stripe, lui, continue de fonctionner).
   ───────────────────────────────────────────────────────────── */
window.LOCOUTILS_CONFIG = {
  SUPABASE_URL: "",       // ex: "https://xxxx.supabase.co"
  SUPABASE_ANON_KEY: ""   // ex: "eyJhbGciOi..."
};
