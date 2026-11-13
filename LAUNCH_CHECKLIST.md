# LAUNCH_CHECKLIST.md — État de Préparation Production FISCALIQ

Légende :
- **Done** : Implémenté, testé et vérifié dans le code (`tsc`, `eslint`, `npm test`, `next build`).
- **Needs me** : Le code est en place et testé ; nécessite uniquement vos clés externes dans `.env` ou vos informations légales d'entreprise avant mise en ligne commerciale.

---

## PHASE 1 : CLARITÉ & SIMPLICITÉ EN FRANÇAIS
- [x] **Done** — Page d'accueil remplacée par : titre « Estimez votre impôt sur le revenu 2026 en 2 minutes », 1 phrase d'accroche, bouton « Commencer », bande en 3 étapes (Répondez → Voyez votre impôt → Découvrez comment économiser), calculateur en direct « Essayez avec votre salaire » (impôt estimé, taux, parts uniquement) et mention « Estimation indicative, non contractuelle. Aucun mot de passe impots.gouv.fr demandé. ».
- [x] **Done** — Suppression de toutes les fausses données bancaires (Cash flow, Recent activity, Savings goals 70 %, multiplicateurs fictifs).
- [x] **Done** — Traduction intégrale de l'interface en français simple et suppression des sous-titres/badges inutilisés. Titres de pages limités à 4 mots maximum.
- [x] **Done** — Navigation réduite à 5 entrées (`Accueil`, `Mon impôt`, `Mon salaire`, `Mes économies`, `Assistant`) identiques sur ordinateur et dans la barre mobile. Redirections `/profitability` → `/declaration` et `/compliance` → `/echeances`.
- [x] **Done** — Suppression du bouton et du panneau « Adjust glass », de l'aperçu SQL/JSON dans `/onboarding`, et du jargon développeur (`moteur déterministe`, `RAG`, `pgvector`, `Supabase`) sur les écrans utilisateurs.
- [x] **Done** — `/onboarding` découpé en 7 composants (`components/onboarding/step-1-residency.tsx` à `step-7-summary.tsx`), 1 question par bloc, étapes facultatives passables en 1 clic, écran final affichant 3 chiffres (`impôt estimé`, `taux`, `parts`) puis « Voir comment économiser ».
- [x] **Done** — Pages denses (`payroll`, `tax-optimization`, `ai-assistant`, `reports`, `declaration`) allégées : résultat principal en premier, maximum 5 blocs visibles par écran, détails repliés dans `ExpandableDetail`.

---

## PHASE 2 : COMPTES UTILISATEURS & DONNÉES
- [x] **Done** — Les nouveaux visiteurs démarrent avec un profil vierge (`EMPTY_USER_HOUSEHOLD` à 0 €). Les profils d'exemple ne sont chargés que si l'utilisateur clique sur « Voir un exemple ».
- [x] **Done** — `/onboarding` crée et met à jour le propre profil de l'utilisateur sans écraser les foyers de démonstration.
- [x] **Done** — Suppression de tout l'état B2B mort du provider (`companies`, `employees`, `taxLevers`, `corporateTax`, `profitability`) et mémoïsation de la valeur du contexte React.
- [x] **Done** — Boutons « Exporter mes données » et « Supprimer mon compte / mes données » reliés aux routes RGPD (`/api/security-audit` et `DELETE /api/profile`) + effacement local immédiat.
- [x] **Done** — Client serveur Supabase Auth & PostgREST RLS (`lib/supabase/server-client.ts`), routes `/api/auth` et `/api/profile`, page `/login` (connexion, inscription, réinitialisation du mot de passe) et `middleware.ts` implémentés.
- [ ] **Needs me** — Renseigner vos clés `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans `.env` et appliquer la migration `supabase/migrations/20260415000001_personal_tax_b2c_schema.sql` sur votre projet Supabase.

---

## PHASE 3 : SÉCURITÉ APPLICATIVE
- [x] **Done** — Résolution de session vérifiée côté serveur (`resolveVerifiedHouseholdSession`) : les routes API ne font jamais confiance à `x-authenticated-household-id` ni aux identifiants passés dans le corps des requêtes.
- [x] **Done** — Route d'administration `POST /api/ai/knowledge-base` : refus par défaut (HTTP 403), jeton administrateur vérifié obligatoire, suppression du rôle par défaut `comite_juridique_interne`. `GET /api/ai/knowledge-base` renvoie uniquement les sources `APPROVED_VERIFIED` aux non-admins. Page `/settings` protégée et retirée de la navigation.
- [x] **Done** — `SWITCH_PLAN_SIMULATION` désactivé en production (HTTP 403) ; changement d'abonnement autorisé uniquement après webhook de paiement signé.
- [x] **Done** — Vérification stricte au démarrage en production (`verifyProductionStartupEnv`) : lève une erreur fatale si `FISCALIQ_REPORT_SIGNING_SECRET`, `GEMINI_API_KEY` ou les clés Supabase manquent en production. Suppression du secret codé en dur.
- [x] **Done** — Adaptateur de stockage partagé (`lib/security/shared-store.ts`) compatible Upstash Redis / Supabase pour le rate-limiting et les abonnements.
- [x] **Done** — En-têtes `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options` et `Referrer-Policy` configurés dans `next.config.ts`. `eslint.ignoreDuringBuilds` et `typescript.ignoreBuildErrors` fixés à `false`.
- [x] **Done** — Masquage automatique des données personnelles sensibles (NIR, numéro fiscal SPI à 13 chiffres, IBAN, téléphone, email) avant tout traitement ou journalisation.

---

## PHASE 4 : PAIEMENTS (FORMULE GRATUIT 0 € / PREMIUM 5 €/MOIS)
- [x] **Done** — Harmonisation des noms de formules partout dans l'application : **Gratuit (0 €)** et **Premium (5 € / mois)**. Suppression de toute mention d'une formule « Plus ».
- [x] **Done** — Routes Stripe Checkout (`/api/stripe/checkout`), Portail Client (`/api/stripe/portal`) et Webhook HMAC-SHA256 (`Stripe-Signature: t=...,v1=...` dans `/api/stripe/webhook` et `verifyAndApplyStripeWebhook`) implémentées et couvertes par les tests unitaires.
- [ ] **Needs me** — Renseigner vos clés `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID` (tarif 5 €/mois) et `STRIPE_WEBHOOK_SECRET` dans `.env`.

---

## PHASE 5 : CONFIANCE, MENTIONS LÉGALES & EXACTITUDE FISCALE
- [x] **Done** — Mention visible « Estimation indicative, non contractuelle » sur chaque résultat et dans chaque PDF généré.
- [x] **Done** — Pages `/privacy` et `/terms` réécrites en français simple pour décrire uniquement ce qui est réellement implémenté, avec des emplacements explicites `[À COMPLÉTER PAR LE FOURNISSEUR]`.
- [ ] **Needs me** — Remplacer `[À COMPLÉTER PAR LE FOURNISSEUR]` dans `/privacy` et `/terms` par votre raison sociale, adresse du siège, SIREN/SIRET, email de contact et contact RGPD/DPO.
- [x] **Done** — Avertissement clair sur l'Assistant : information générale basée sur les sources officielles, ne constituant pas un conseil fiscal personnalisé.
- [x] **Done** — Barème progressif 2026 & 2025, plafonnement du quotient familial, décote et abattement de 10 % vérifiés et couverts par des tests unitaires dédiés dans `lib/calculations/engine.test.ts` avec l'URL officielle `https://www.service-public.fr/particuliers/vosdroits/F1419`.

---

## PHASE 6 : PERFORMANCE & NETTOYAGE
- [x] **Done** — Layouts de groupes de routes Next.js (`app/(public)/layout.tsx` et `app/(app)/layout.tsx`) utilisant un composant unique `SharedShell` (`components/layout/shared-shell.tsx`) qui ne se remonte pas à chaque navigation.
- [x] **Done** — Styles `.gw-*` déplacés dans `app/globals.css` et suppression des fichiers démo `adjustable-glass-dashboard.tsx` et `glass-workspace-demo.tsx`.
- [x] **Done** — Image de fond Unsplash remplacée par une ressource locale optimisée via `next/image`.
- [x] **Done** — Suppression des fichiers inutilisés (`fintech-visuals.tsx`, `deployment-readiness.ts`, `use-mobile.ts`, `lib/utils.ts`) et désinstallation des paquets inutilisés (`gsap`, `@gsap/react`, `recharts`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@hookform/resolvers`, `@tailwindcss/typography`).
- [x] **Done** — Suppression complète de `/app/api/tax-assistant` et support du streaming Gemini réel (`generateContentStream`) ou réponse JSON directe dans `/app/api/ai/assistant`.

---

## PHASE 7 : QUALITÉ & OPÉRATIONS
- [x] **Done** — Script `"test": "tsx --test lib/calculations/engine.test.ts"` dans `package.json` (22 suites de tests unitaires passantes) et pipeline CI GitHub Actions (`.github/workflows/ci.yml`) exécutant `tsc`, `eslint`, les tests unitaires et `next build`.
- [x] **Done** — Route `GET /api/health` et pages `app/not-found.tsx` (404) et `app/error.tsx` en français.
- [x] **Done** — Fichiers `app/sitemap.ts` et `app/robots.ts` configurés.
- [x] **Done** — Guides `DEPLOY.md` et `LAUNCH_CHECKLIST.md` créés à la racine du projet.
