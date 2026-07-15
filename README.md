# LOCOUTILS37 — dépôt Git prêt

Version reconstruite le 15 juillet 2026 à partir du dépôt officiel `AtlasCoreUs/locoutils37` et de l’audit final.

## Inclus

- 22 outils dans une source unique : `data/tools.json`.
- Accueil, catalogue filtrable et template produit commun.
- 22 anciennes URLs conservées par redirections Netlify 200.
- Stripe Checkout **location uniquement**.
- Caution séparée par `PaymentIntent` avec `capture_method: manual`, disponible au maximum 5 jours avant le retrait.
- Verrou Supabase avant paiement + contrainte SQL anti-chevauchement.
- Webhook Stripe signé, idempotent et compatible body Base64 Netlify.
- Libération/capture de caution protégées par `ADMIN_TOKEN`.
- Page Merci branchée sur un statut réel.
- Tests Playwright des 22 fiches et validation statique du projet.
- SEO, sitemap, robots, 404, mentions/CGV/RGPD.

## Import GitHub

1. Décompresser le ZIP.
2. Sous Windows, double-cliquer sur `PUSH_GITHUB_SAFE.bat` pour envoyer une branche sans écraser `main`, ou ouvrir un terminal dans le dossier.
3. Exécuter :

```bash
git init
git add .
git commit -m "feat: LOCOUTILS37 production rebuild"
git branch -M main
git remote add origin https://github.com/AtlasCoreUs/locoutils37.git
git push -u origin main --force-with-lease
```

Pour éviter d’écraser `main`, utilisez plutôt une branche :

```bash
git checkout -b feat/production-rebuild-2026-07-15
git push -u origin feat/production-rebuild-2026-07-15
```

## Configuration Supabase

1. Créer un projet **Staging**.
2. Ouvrir SQL Editor.
3. Exécuter `supabase-migration-complete.sql`.
4. Vérifier la table `reservations`, `stripe_events` et la vue `public_availability`.

## Variables Netlify

Copier les noms de `.env.example` dans **Site configuration → Environment variables** :

- `STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL=https://locoutils37final.netlify.app`
- `ADMIN_TOKEN` : chaîne aléatoire longue, jamais publiée.

Ne jamais placer `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET` ou `ADMIN_TOKEN` dans un fichier Git.

## Webhook Stripe

URL :

```text
https://locoutils37final.netlify.app/.netlify/functions/stripe-webhook
```

Événements à activer :

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.amount_capturable_updated`
- `payment_intent.canceled`
- `payment_intent.payment_failed`
- `payment_intent.succeeded`
- `charge.refunded`

## Tests

```bash
npm install
npx playwright install chromium
npm run test:syntax
npm test
```

## Commandes admin caution

Libérer :

```bash
curl -X POST https://locoutils37final.netlify.app/.netlify/functions/release-deposit \
  -H "Authorization: Bearer VOTRE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reservationId":"UUID"}'
```

Capturer 30 € :

```bash
curl -X POST https://locoutils37final.netlify.app/.netlify/functions/capture-deposit \
  -H "Authorization: Bearer VOTRE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reservationId":"UUID","amount":3000}'
```

## Points manuels indispensables avant production

- Les chemins pointent d’abord vers les vraies photos déjà présentes dans le dépôt `locoutils37`. Les SVG inclus servent uniquement de secours dans un dépôt neuf. Vérifier visuellement les 22 correspondances après fusion.
- Compléter l’identité juridique, le SIRET, l’adresse professionnelle et le médiateur dans `mentions-legales.html`.
- Tester Stripe en mode test, notamment une double réservation simultanée et le cycle autorisation/libération/capture de caution.
- Reconnecter Netlify au dépôt GitHub si l’erreur `Host key verification failed` réapparaît ; ce problème concerne l’accès au dépôt, pas le code.
