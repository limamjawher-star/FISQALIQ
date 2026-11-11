# FISCALIQ — Plateforme Française d’Intelligence Fiscale Personnelle, Salaire, Prélèvement à la Source & Déclaration Annuelle

**Vos impôts, enfin compréhensibles.**

FISCALIQ est une application web full-stack française conçue pour aider les particuliers et foyers fiscaux (salariés, couples mariés ou pacsés, parents isolés, retraités, propriétaires bailleurs, indépendants) à :
1. **Estimer leur impôt sur le revenu** (barèmes officiels 2026 sur les revenus 2025 et 2025 sur les revenus 2024, quotient familial, décote, plafonnement des effets du quotient familial).
2. **Découvrir les réductions, déductions et crédits d’impôt** auxquels ils peuvent prétendre (frais réels vs abattement 10 %, garde d’enfant de moins de 6 ans, emploi à domicile, dons, PER, pension alimentaire, revenus locatifs).
3. **Comprendre leur fiche de paie et le prélèvement à la source (PAS)** (cotisations sociales, salaire net avant impôt, salaire net imposable avec CSG/CRDS non déductible, taux personnalisé, taux individualisé des couples et taux neutre).
4. **Poser des questions en français simple à l’Assistant fiscal IA** adossé exclusivement aux textes officiels vérifiés (**impots.gouv.fr, Service-Public.fr, BOFiP, economie.gouv.fr, Légifrance**) et aux calculs déterministes côté serveur.
5. **Préparer leur déclaration annuelle de revenus (formulaire 2042)** et générer des **rapports PDF côté serveur** stockés dans un compartiment privé avec liens signés à durée de vie limitée (15 minutes).

---

## 1. Framework Réel Inspecté & Stack Technique

L’inspection du dépôt confirme que l’application repose sur **Next.js 15 (App Router)** avec **React 19**, **TypeScript 5.9** et **Tailwind CSS v4** :

| Composant | Technologie / Version vérifiée (`package.json`) | Rôle dans l’architecture |
| :--- | :--- | :--- |
| **Framework Full-Stack** | `next` `^15.4.9` (App Router) | Rendu serveur/client (`app/`), routage et routes API Node.js (`app/api/*/route.ts`) |
| **Bibliothèque UI** | `react` `^19.2.1` & `react-dom` `^19.2.1` | Composants interactifs, simulateurs fiscaux et gestion d’état par foyer |
| **Typage** | `typescript` `5.9.3` (`strict: true`) | Vérification statique de bout en bout (moteurs fiscaux, API, schémas) |
| **Styles** | `tailwindcss` `4.1.11` (`@tailwindcss/postcss`) | Design system fintech européen (`#101827` Deep Navy, `#F8FAFC` Off-White, `#10B981` Emerald) |
| **Validation** | `zod` `^4.6.7` | Validation stricte des entrées API, formulaires et schémas JSON IA |
| **IA & Embeddings** | `@google/genai` `^3.0.0` | Appels Gemini **exclusivement côté serveur** (`gemini-3.8-flash` & `gemini-embedding-2`) |
| **Graphiques** | `recharts` `^3.10.1` | Visualisation des tranches d’impôt, salaires et échéances |
| **Tests automatisés** | `node:test` + `node:assert/strict` (`tsx`) | 20 suites de tests déterministes (calculs 2026/2025, RAG, PDF, sécurité, RGPD) |

---

## 2. Structure du Projet & Cartographie des Routes

```text
├── app/
│   ├── api/
│   │   ├── calculations/route.ts      # POST : Moteurs déterministes (IR foyer 2026/2025, Salaire & PAS, IS, Paie, SIG)
│   │   ├── tax-assistant/route.ts     # POST : Assistant fiscal personnel (RAG officiel + isolation 403 + PII masking)
│   │   ├── ai/assistant/route.ts      # POST : Route compatible Assistant IA avec contrôle d'isolation et Rate Limit
│   │   ├── ai/knowledge-base/route.ts # GET/POST : Registre des sources officielles, pgvector & pare-feu documentaire
│   │   ├── reports/route.ts           # GET/POST : Génération serveur des rapports PDF & gestion Free / Plus / Premium
│   │   ├── reports/download/route.ts  # GET : Téléchargement binaire PDF via jeton signé HMAC-SHA256 (TTL 15 min)
│   │   └── security-audit/route.ts    # GET/POST : Rapport d'audit sécurité, Export RGPD (Art. 15/20) & Purge (Art. 17)
│   ├── page.tsx                       # Page d'accueil particuliers (Hero + aperçu calculateur IR + 8 sections)
│   ├── dashboard/page.tsx             # Mon tableau de bord personnel (synthèse IR, parts, PAS, échéances)
│   ├── onboarding/page.tsx            # Assistant de profil fiscal en 7 étapes (résidence, foyer, enfants, revenus...)
│   ├── tax-optimization/page.tsx      # Moteur de découverte des réductions, déductions et crédits d'impôt
│   ├── payroll/page.tsx               # Simulateur Mon salaire, bulletin de paie & prélèvement à la source (PAS)
│   ├── ai-assistant/page.tsx          # Assistant fiscal personnel (français simple, citations officielles, glossaire)
│   ├── profitability/page.tsx         # Compagnon de préparation à la déclaration annuelle 2042
│   ├── compliance/page.tsx            # Mon calendrier fiscal officiel vérifié
│   ├── reports/page.tsx               # Mes rapports PDF privés & gestion de l'abonnement (Free, Plus, Premium)
│   ├── pricing/page.tsx               # Présentation transparente des formules Free, Plus et Premium
│   ├── settings/page.tsx              # Administration de la base officielle, pgvector, barèmes & Audit Sécurité/RGPD
│   └── privacy/page.tsx               # Politique de confidentialité RGPD (Art. 13/14), Criblage AIPD & Audit
├── lib/
│   ├── calculations/
│   │   ├── tax-parameters.ts          # Barèmes et plafonds officiels versionnés (2026 revenus 2025 & 2025 revenus 2024)
│   │   ├── personal-tax-engine.ts     # Calculs déterministes (IR, quotient familial, salaire net, PAS, optimisation)
│   │   ├── declaration-companion-engine.ts # Moteur de checklist déclarative 2042 et solde d'impôt d'été
│   │   ├── engine.ts                  # Fonctions déterministes complémentaires
│   │   └── engine.test.ts             # Suite complète de tests unitaires et d'intégration
│   ├── ai/
│   │   ├── knowledge-base.ts          # Registre des sources officielles, versions historiques immuables & pgvector
│   │   └── gemini-service.ts          # Service serveur Gemini avec RAG obligatoire et repli déterministe
│   ├── reports/
│   │   └── pdf-report-service.ts      # Générateur serveur de fichiers %PDF-1.4 et jetons signés HMAC-SHA256
│   ├── subscriptions/
│   │   └── entitlements.ts            # Droits et quotas serveur (FREE, PLUS, PREMIUM) + abstraction de paiement
│   ├── security/
│   │   └── security-audit-and-gdpr.ts # Rate limiting, CSRF, isolation 403, masquage NIR/SPI/IBAN, droits RGPD
│   ├── deployment/
│   │   └── deployment-readiness.ts    # Vérification déterministe de l'état de préparation au déploiement
│   └── supabase/
│       └── config.ts                  # Schémas SQL DDL, politiques RLS (`auth.uid() = user_id`) et Storage privé
├── supabase/
│   └── migrations/
│       └── 20261110000001_fiscaliq_personal_tax_complete_schema.sql # Script SQL idempotent complet
├── vercel.json                        # Configuration Vercel (framework Next.js, région UE Paris `cdg1`, timeouts)
└── .env.example                       # Modèle documenté des variables d'environnement (aucun secret commité)
```

---

## 3. Variables d’Environnement : Publiques vs Serveur Uniquement

> **Règle de sécurité absolue :** Ne commitez jamais de fichier `.env`, `.env.local` ou `.env.production` contenant de vraies clés. Toute variable préfixée par `NEXT_PUBLIC_` est visible dans le code JavaScript envoyé au navigateur. **Les clés secrètes ne doivent jamais porter le préfixe `NEXT_PUBLIC_`.**

| Variable | Visibilité | Obligatoire en Prod | Usage |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_ENV` | **Publique** (Navigateur) | Oui | Identifie l’environnement courant (`development`, `preview`, `production`). |
| `NEXT_PUBLIC_SUPABASE_URL` | **Publique** (Navigateur) | Oui | URL publique du projet Supabase (Auth et requêtes soumises au RLS). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Publique** (Navigateur) | Oui | Clé anonyme publique Supabase (protégée par Row-Level Security `auth.uid() = user_id`). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Serveur uniquement** *(Secret)* | Oui | Clé `service_role` Supabase utilisée uniquement dans les routes API serveur. |
| `SUPABASE_STORAGE_BUCKET` | **Serveur uniquement** | Oui | Nom du compartiment privé Supabase Storage (`fiscaliq-personal-reports`). |
| `GEMINI_API_KEY` | **Serveur uniquement** *(Secret)* | Oui | Clé API Google Gemini appelée uniquement côté serveur (`/api/tax-assistant`, `/api/ai/*`). |
| `FISCALIQ_REPORT_SIGNING_SECRET` | **Serveur uniquement** *(Secret)* | Oui | Secret HMAC-SHA256 (32+ octets aléatoires) signant les liens PDF temporaires (15 min). |
| `APP_URL` | **Serveur uniquement** | Oui | URL canonique de l’application (`http://localhost:3000` en dev, domaine final en prod). |

---

## 4. Configurations Séparées : Development, Preview et Production

Configurez trois environnements strictement séparés dans Vercel (**Project Settings → Environment Variables**) et Supabase :

### A. Environnement `Development` (Local — `.env.local` non commité)
- Copiez `.env.example` vers `.env.local` : `cp .env.example .env.local`
- `NEXT_PUBLIC_APP_ENV="development"`
- `APP_URL="http://localhost:3000"`
- Si `GEMINI_API_KEY` ou Supabase ne sont pas encore renseignés en local, l’application active automatiquement son **mode de repli déterministe en mémoire** afin que tous les simulateurs, la base de connaissances et le générateur PDF fonctionnent immédiatement.

### B. Environnement `Preview` (Branches Git / Pull Requests sur Vercel)
- Associez un projet Supabase **Staging / Preview** dédié (ne jamais brancher les Pull Requests sur la base de données de production contenant de vraies données fiscales).
- `NEXT_PUBLIC_APP_ENV="preview"`
- `NEXT_PUBLIC_SUPABASE_URL="https://<staging-ref>.supabase.co"`
- `FISCALIQ_REPORT_SIGNING_SECRET` : secret aléatoire dédié à l’environnement Preview (`openssl rand -base64 32`).
- `GEMINI_API_KEY` : clé API Gemini dédiée aux tests de pré-production avec quota plafonné.

### C. Environnement `Production` (Branche `main` sur Vercel)
- Associez un projet Supabase **Production** hébergé dans l’Union européenne (**Irlande `eu-west-1` ou Francfort `eu-central-1`** ou **Paris**).
- `NEXT_PUBLIC_APP_ENV="production"`
- `APP_URL="https://app.fiscaliq.fr"` (votre domaine personnalisé).
- `FISCALIQ_REPORT_SIGNING_SECRET` : secret cryptographique unique de production (`openssl rand -base64 32`).
- Activez les sauvegardes automatiques PostgreSQL (*Point-in-Time Recovery*) dans Supabase.

---

## 5. Instructions de Migration Supabase PostgreSQL, `pgvector`, Storage & Auth

### Étape 1 : Appliquer la migration SQL complète
Le script SQL consolidé et idempotent se trouve dans :
`supabase/migrations/20261110000001_fiscaliq_personal_tax_complete_schema.sql`

Vous pouvez l’appliquer :
- **Via Supabase CLI** :
  ```bash
  supabase link --project-ref <votre-project-ref>
  supabase db push
  ```
- **Ou via l’éditeur SQL du Dashboard Supabase** : copiez-collez le contenu de `supabase/migrations/20261110000001_fiscaliq_personal_tax_complete_schema.sql` et exécutez-le.

Ce script provisionne :
1. L’extension `vector` (`pgvector`) et l’index HNSW sur `public.tax_knowledge_chunks`.
2. La fonction RPC `public.match_verified_tax_chunks` qui filtre strictement `verification_status = 'APPROVED_VERIFIED'`.
3. Les tables personnelles (`personal_tax_profiles`, `user_subscriptions`, `subscription_usage_counters`, `personal_tax_reports`, `personal_tax_conversations`, `personal_tax_messages`, `gdpr_data_subject_requests`) avec **Row-Level Security (`auth.uid() = user_id`)**.
4. Le compartiment privé `fiscaliq-personal-reports` (`public = false`, taille max 5 Mo, `application/pdf` uniquement) avec politiques RLS par dossier utilisateur.
5. La révocation explicite `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;`.

### Étape 2 : Configurer Supabase Authentication
Dans le Dashboard Supabase (**Authentication → Configuration**) :
1. Activez le fournisseur **Email / Password** (avec confirmation d’adresse e-mail obligatoire) et l’authentification multifacteur (**MFA TOTP** recommandée).
2. Configurez **Site URL** :
   - En développement : `http://localhost:3000`
   - En production : `https://app.fiscaliq.fr`
3. Ajoutez les **Redirect URLs** autorisées :
   - `http://localhost:3000/**`
   - `https://*-<votre-equipe>.vercel.app/**` (pour les déploiements Preview)
   - `https://app.fiscaliq.fr/**`

---

## 6. Configuration Serveur de l’API Gemini

1. Créez une clé API dans Google AI Studio / Google Cloud Vertex AI.
2. Enregistrez-la sous le nom exact `GEMINI_API_KEY` dans vos variables d’environnement serveur Vercel (sans jamais utiliser `NEXT_PUBLIC_`).
3. Toutes les requêtes Gemini sont exécutées côté serveur dans :
   - `/app/api/tax-assistant/route.ts` et `/app/api/ai/assistant/route.ts` (modèle `gemini-3.8-flash` avec RAG obligatoire sur les sources officielles `APPROVED_VERIFIED`).
   - `/app/api/ai/knowledge-base/route.ts` (modèle `gemini-embedding-2` pour la vectorisation 768 dimensions).

---

## 7. Instructions de Test, Linting et Build de Production

Exécutez les commandes suivantes à la racine du projet avant tout déploiement :

```bash
# 1. Installer les dépendances
npm install

# 2. Exécuter les 20 suites de tests unitaires, fiscaux (2026 & 2025), PDF et sécurité/RGPD
npx tsx --test lib/calculations/engine.test.ts

# 3. Vérifier le linter ESLint (0 erreur, 0 avertissement)
npm run lint

# 4. Compiler le build de production Next.js 15 & vérifier le typage TypeScript strict
npm run build

# 5. Démarrer le serveur en local sur le port 3000
npm run dev
```

---

## 8. Synchronisation GitHub, Déploiement Vercel & Domaine Personnalisé

### A. Synchronisation avec GitHub
1. Vérifiez qu’aucun fichier `.env` secret n’est suivi par Git :
   ```bash
   git status
   ```
   *(Seul `.env.example` doit figurer dans le dépôt ; `.env*` est ignoré par `.gitignore`).*
2. Initialisez et poussez vers votre dépôt GitHub privé :
   ```bash
   git init
   git add .
   git commit -m "chore: prepare FISCALIQ Next.js 15 platform for GitHub & Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/<votre-organisation>/<votre-depot>.git
   git push -u origin main
   ```

### B. Intégration Vercel (Preview & Production)
1. Connectez-vous à **Vercel** et cliquez sur **Add New… → Project**.
2. Importez votre dépôt GitHub. Vercel détecte automatiquement le preset **Next.js** et lit le fichier `vercel.json` (qui fixe la région des fonctions serverless sur **`cdg1` — Paris, France** pour la proximité européenne des données).
3. Dans **Environment Variables**, ajoutez les variables listées à la section 3 en cochant séparément les cibles **Production**, **Preview** et **Development**.
4. **Déploiements Preview** : chaque branche ou Pull Request ouverte sur GitHub génère automatiquement une URL de prévisualisation isolée (`https://fiscaliq-git-<branche>.vercel.app`) utilisant les variables `Preview`.
5. **Déploiement Production** : chaque fusion (*merge*) sur la branche `main` déclenche le build `npm run build` et publie la version de production.

### C. Configuration du Domaine Personnalisé & Certificat TLS/SSL
1. Dans votre projet Vercel, ouvrez **Settings → Domains** et ajoutez votre domaine (ex. `app.fiscaliq.fr` ou `fiscaliq.fr`).
2. Chez votre registraire DNS (OVHcloud, Gandi, Cloudflare, etc.), configurez :
   - Pour un sous-domaine (`app.fiscaliq.fr`) : un enregistrement **`CNAME`** pointant vers `cname.vercel-dns.com.`
   - Pour un domaine racine (`fiscaliq.fr`) : un enregistrement **`A`** pointant vers `76.76.21.21`.
3. Vercel provisionne et renouvelle automatiquement le certificat **Let’s Encrypt TLS/SSL (HTTPS)**. Mettez ensuite à jour `APP_URL` dans Vercel et **Site URL** dans Supabase Auth.

---

## 9. Liste de Contrôle Manuelle Finale avant Mise en Production

> **État de vérification honnête :** Le code source, le build de production Next.js 15, le linter ESLint, les 20 suites de tests automatisés et le script de migration SQL sont vérifiés dans cet environnement. En revanche, **la connexion au dépôt GitHub distant, au projet Vercel externe, à l’instance Supabase PostgreSQL de production et au domaine DNS nécessite votre action manuelle** selon la liste ci-dessous :

- [ ] **1. Audit des secrets Git** : Vérifier avec `git status` qu’aucun fichier `.env.local` ou clé réelle n’est indexé avant le `git push`.
- [ ] **2. Création des projets Supabase (Staging & Production en région UE)** : Créer deux projets distincts dans l’Union européenne (`eu-west-1` ou `eu-central-1`) et exécuter `supabase/migrations/20261110000001_fiscaliq_personal_tax_complete_schema.sql`.
- [ ] **3. Vérification du compartiment privé Supabase Storage** : Confirmer dans Supabase Storage que le bucket `fiscaliq-personal-reports` est bien en mode `public = false`.
- [ ] **4. Configuration des variables d’environnement dans Vercel** : Renseigner `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `FISCALIQ_REPORT_SIGNING_SECRET` (`openssl rand -base64 32`) et `APP_URL` séparément pour *Preview* et *Production*.
- [ ] **5. Validation juridique & RGPD (DPO / Avocat)** : Faire valider le registre des traitements (Art. 30), les contrats sous-traitants (DPA Art. 28 avec Supabase, Vercel et Google Cloud) et l’Analyse d’Impact (AIPD Art. 35) avant l’ouverture au public.
- [ ] **6. Test de fumée post-déploiement** : Vérifier sur l’URL Vercel que `/`, `/dashboard`, `/ai-assistant`, `/reports`, `/privacy` et `/api/security-audit` répondent en HTTPS avec les en-têtes de sécurité actifs.
