# Guide de Déploiement Production — FISCALIQ

Ce document décrit les étapes exactes pour déployer FISCALIQ en production (Vercel / Node.js + Supabase PostgreSQL + Stripe + Gemini API).

## 1. Variables d'environnement requises en production

Configurez ces variables dans votre hébergeur (Vercel / Cloud Run) avant le démarrage :

| Variable | Rôle | Obligatoire en production |
| --- | --- | --- |
| `FISCALIQ_REPORT_SIGNING_SECRET` | Secret HMAC-SHA256 (>= 32 caractères) pour signer les sessions et les liens PDF temporaires (15 min) | Oui (bloque le démarrage si absent) |
| `GEMINI_API_KEY` | Clé serveur Google Gemini API (ne jamais préfixer par `NEXT_PUBLIC_`) | Oui (bloque le démarrage si absent) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase | Oui (bloque le démarrage si absent) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique anonyme Supabase (soumise aux règles RLS) | Oui (bloque le démarrage si absent) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé d'administration serveur Supabase (uniquement côté serveur) | Oui |
| `FISCALIQ_ADMIN_SESSION_TOKEN` | Jeton secret d'administration pour `/settings` et `POST /api/ai/knowledge-base` | Oui |
| `UPSTASH_REDIS_REST_URL` | URL Redis partagée pour le rate-limiting et l'état des abonnements | Recommandé |
| `UPSTASH_REDIS_REST_TOKEN` | Jeton Redis partagé | Recommandé |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (formule Premium 5 €/mois) | Oui (pour activer le paiement) |
| `STRIPE_WEBHOOK_SECRET` | Secret de vérification de signature du webhook Stripe | Oui (pour activer le paiement) |

## 2. Base de données Supabase & Row-Level Security (RLS)

1. Ouvrez l'éditeur SQL de votre projet Supabase.
2. Exécutez la migration complète située dans `supabase/migrations/20261110_fiscaliq_production_schema.sql`.
3. Vérifiez que le compartiment privé `fiscaliq-personal-reports` est créé (`public = false`).

## 3. Vérification avant mise en ligne (CI/CD)

Exécutez les 4 commandes de vérification :

```bash
npx tsc --noEmit
npx eslint .
npm test
npm run build
```

## 4. Sondes de santé et SEO

- **Santé serveur** : `GET /api/health` renvoie `200 OK` avec `{ "status": "ok" }`.
- **Sitemap & Robots** : `/sitemap.xml` et `/robots.txt` sont générés automatiquement (`/api/` et `/settings` sont exclus de l'indexation).
