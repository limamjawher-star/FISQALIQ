/**
 * FISCALIQ — Base de Connaissances Officielle de la Fiscalité Personnelle Française
 * Registre des Sources, Hiérarchie Normative, Versionnement Historique Immuable,
 * Pipeline d'Ingestion / Découpage (Chunking) / Embeddings (pgvector) & Gouvernance
 *
 * SOURCES OFFICIELLES PRIORITAIRES :
 * 1. Légifrance (legifrance.gouv.fr) — Législation : Code général des impôts (CGI), Lois de finances
 * 2. BOFiP-Impôts (bofip.impots.gouv.fr) — Doctrine administrative opposable (LPF Art. L80 A)
 * 3. impots.gouv.fr (DGFiP) — Explications officielles de l'administration fiscale & notices 2042
 * 4. Service-Public Particuliers (service-public.fr) — Fiches pratiques vérifiées DILA
 * 5. economie.gouv.fr (Ministère de l'Économie et des Finances / Bercy Infos Particuliers)
 *
 * RÈGLES D'INTÉGRITÉ :
 * - Seules les sources au statut `APPROVED_VERIFIED` peuvent fonder une réponse fiscale faisant foi.
 * - Les versions antérieures (ex. revenus 2024 / déclaration 2025) sont conservées dans l'historique
 *   sans jamais être écrasées silencieusement lors d'une mise à jour.
 * - Distinction stricte entre : Législation (CGI), Doctrine administrative (BOFiP),
 *   Explications officielles (impots.gouv.fr / Service-Public / economie.gouv.fr) et Contenu pédagogique FISCALIQ.
 * - Respect des droits de réutilisation publique (Licence Ouverte Etalab 2.0) et absence de scraping abusif.
 */

export type PersonalTaxDomain =
  | 'IMPOT_REVENU_BAREME'
  | 'SALAIRE_PRELEVEMENT_SOURCE'
  | 'QUOTIENT_FAMILIAL_ENFANTS'
  | 'FRAIS_PROFESSIONNELS'
  | 'CREDITS_REDUCTIONS_IMPOT'
  | 'DEDUCTIONS_EPARGNE_PENSIONS'
  | 'REVENUS_FONCIERS_LOCATIFS'
  | 'RETRAITE_PENSIONS'
  | 'DECLARATION_CALENDRIER';

/**
 * Les 12 thématiques obligatoires de la base de connaissances fiscale personnelle
 */
export type PersonalTaxKnowledgeTopic =
  | 'IMPOT_REVENU_BAREME'
  | 'COMPOSITION_FOYER'
  | 'QUOTIENT_FAMILIAL_PARTS'
  | 'SALAIRES_TRAITEMENTS'
  | 'PENSIONS_RETRAITES'
  | 'REVENUS_FONCIERS_LOCATIFS'
  | 'DEDUCTIONS_REVENU_GLOBAL'
  | 'REDUCTIONS_IMPOT'
  | 'CREDITS_IMPOT'
  | 'PRELEVEMENT_A_LA_SOURCE'
  | 'PROCEDURES_DECLARATION'
  | 'OBLIGATIONS_PAIEMENT_RECOUVREMENT';

export type OfficialPublisher =
  | 'impots.gouv.fr'
  | 'BOFiP'
  | 'Service-Public Particuliers'
  | 'economie.gouv.fr'
  | 'Legifrance';

/**
 * Hiérarchie normative explicite distinguant la loi, la doctrine opposable,
 * l'explication administrative officielle et la vulgarisation pédagogique FISCALIQ
 */
export type NormativeTier =
  | 'LEGISLATION_CGI_LOI'
  | 'DOCTRINE_BOFIP'
  | 'EXPLICATION_OFFICIELLE_ADMINISTRATION'
  | 'CONTENU_PEDAGOGIQUE_FISCALIQ';

export type SourceVerificationStatus =
  | 'APPROVED_VERIFIED'
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'ARCHIVED_HISTORICAL';

export interface ExplainedTerm {
  term: string;
  plainExplanation: string;
}

export interface HistoricalSourceVersion {
  versionNumber: number;
  applicableIncomeYear: 2024 | 2025;
  applicableTaxYear: 2025 | 2026;
  effectiveDate: string;
  publicationDate: string;
  modificationDate: string;
  archivedDate: string;
  officialReference: string;
  normativeExcerpt: string;
  plainFrenchSummary: string;
  changeReason: string;
}

export interface OfficialPersonalTaxDocument {
  id: string;
  title: string;
  domain: PersonalTaxDomain;
  topic: PersonalTaxKnowledgeTopic;
  publisher: OfficialPublisher;
  authority:
    | 'impots.gouv.fr'
    | 'Service-Public.fr'
    | 'Legifrance'
    | 'BOFiP'
    | 'URSSAF'
    | 'Service-Public Particuliers'
    | 'economie.gouv.fr';
  normativeTier: NormativeTier;
  verificationStatus: SourceVerificationStatus;
  officialReference: string;
  officialUrl: string;
  sourceUrl: string;
  publicationDate: string;
  modificationDate: string;
  retrievalDate: string;
  applicableIncomeYear: 2025 | 2024;
  applicableTaxYear: 2026 | 2025;
  effectiveDate: string;
  effectiveFromDate: string;
  verifiedDate: string;
  versionNumber: number;
  supersedesDocumentId?: string;
  historicalVersions: HistoricalSourceVersion[];
  normativeExcerpt: string;
  plainFrenchSummary: string;
  fiscaliqEducationalNotes: string;
  whyItApplies: string;
  eligibilityConditions: string[];
  exclusionsAndLimits: string[];
  declarationBoxes: string[];
  explainedTerms: ExplainedTerm[];
  simpleExample: string;
  copyrightAndAccessNotice: string;
  ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION' | 'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT';
  reviewedBy: string;
  reviewNotes: string;
  keywords: string[];
}

export interface KnowledgeDocumentChunk {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  publisher: OfficialPublisher;
  officialUrl: string;
  officialReference: string;
  versionNumber: number;
  chunkIndex: number;
  sectionHeading: string;
  sectionTier: NormativeTier;
  chunkText: string;
  tokenEstimate: number;
  applicableIncomeYear: 2025 | 2024;
  applicableTaxYear: 2026 | 2025;
  effectiveDate: string;
  topic: PersonalTaxKnowledgeTopic;
  verificationStatus: SourceVerificationStatus;
  embeddingPreview: number[];
}

export interface KnowledgeChunkSearchResult {
  chunk: KnowledgeDocumentChunk;
  source: OfficialPersonalTaxDocument;
  semanticSimilarity: number;
  keywordScore: number;
  combinedScore: number;
}

/**
 * Compatibilité descendante avec les anciens types du corpus
 */
export interface OfficialLegalReference {
  id: string;
  title: string;
  category:
    | 'IS_FISCALITE'
    | 'PAIE_URSSAF'
    | 'TVA_DECLARATIONS'
    | 'DIRIGEANT_STATUT'
    | 'INNOVATION_CREDITS'
    | PersonalTaxDomain;
  authority:
    | 'impots.gouv.fr'
    | 'BOFiP'
    | 'URSSAF'
    | 'Legifrance'
    | 'Service-Public Entreprendre'
    | 'Service-Public.fr'
    | 'Service-Public Particuliers'
    | 'economie.gouv.fr';
  officialReference: string;
  sourceUrl: string;
  applicableTaxYear: number;
  verifiedDate: string;
  summary: string;
  eligibilityConditions: string[];
  keywords: string[];
}

export const TOPIC_LABELS_FR: Record<PersonalTaxKnowledgeTopic, string> = {
  IMPOT_REVENU_BAREME: '1. Impôt sur le revenu & barème progressif',
  COMPOSITION_FOYER: '2. Composition du foyer fiscal',
  QUOTIENT_FAMILIAL_PARTS: '3. Quotient familial & parts fiscales',
  SALAIRES_TRAITEMENTS: '4. Salaires, traitements & frais professionnels',
  PENSIONS_RETRAITES: '5. Pensions de retraite & rentes',
  REVENUS_FONCIERS_LOCATIFS: '6. Revenus fonciers & locations immobilières',
  DEDUCTIONS_REVENU_GLOBAL: '7. Déductions du revenu global (PER, pensions)',
  REDUCTIONS_IMPOT: '8. Réductions d’impôt (dons, investissements)',
  CREDITS_IMPOT: '9. Crédits d’impôt (garde d’enfant, emploi à domicile)',
  PRELEVEMENT_A_LA_SOURCE: '10. Prélèvement à la source (taux, acomptes, modulation)',
  PROCEDURES_DECLARATION: '11. Procédures de déclaration annuelle (2042)',
  OBLIGATIONS_PAIEMENT_RECOUVREMENT: '12. Obligations de paiement, solde & recouvrement',
};

export const NORMATIVE_TIER_LABELS_FR: Record<
  NormativeTier,
  { label: string; badgeClass: string; description: string }
> = {
  LEGISLATION_CGI_LOI: {
    label: 'Législation (CGI / Loi de finances)',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    description:
      'Texte de loi voté par le Parlement et codifié au Code général des impôts (Légifrance). Source normative suprême.',
  },
  DOCTRINE_BOFIP: {
    label: 'Doctrine administrative opposable (BOFiP)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    description:
      'Interprétation officielle de la DGFiP publiée au BOFiP-Impôts, opposable à l’administration (Article L80 A du LPF).',
  },
  EXPLICATION_OFFICIELLE_ADMINISTRATION: {
    label: 'Explication officielle (impots.gouv.fr / Service-Public / Bercy)',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    description:
      'Fiches pratiques et notices explicatives officielles publiées par la DGFiP, la DILA (Service-Public) ou le Ministère de l’Économie.',
  },
  CONTENU_PEDAGOGIQUE_FISCALIQ: {
    label: 'Vulgarisation pédagogique FISCALIQ',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    description:
      'Synthèse en langage courant et exemples chiffrés rédigés par FISCALIQ à partir des textes officiels vérifiés (ne se substitue pas au texte légal).',
  },
};

export const INITIAL_PERSONAL_TAX_KNOWLEDGE_BASE: OfficialPersonalTaxDocument[] = [
  // ==========================================================================
  // 1. IMPÔT SUR LE REVENU & BARÈME PROGRESSIF (2026 & 2025) — Légifrance
  // ==========================================================================
  {
    id: 'doc-ir-bareme-decote-2026',
    title: 'Barème progressif de l’impôt sur le revenu 2026 (revenus 2025) et mécanisme de la décote',
    domain: 'IMPOT_REVENU_BAREME',
    topic: 'IMPOT_REVENU_BAREME',
    publisher: 'Legifrance',
    authority: 'Legifrance',
    normativeTier: 'LEGISLATION_CGI_LOI',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference:
      'Code général des impôts (CGI) — Art. 197, I-1° et I-4° (Loi de finances pour 2026, revalorisation de +0,9 %)',
    officialUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048768743',
    sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F1419',
    publicationDate: '2025-12-30',
    modificationDate: '2026-01-02',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 2,
    supersedesDocumentId: 'doc-ir-bareme-decote-2025',
    historicalVersions: [
      {
        versionNumber: 1,
        applicableIncomeYear: 2024,
        applicableTaxYear: 2025,
        effectiveDate: '2025-01-01',
        publicationDate: '2025-02-14',
        modificationDate: '2025-02-15',
        archivedDate: '2026-01-01',
        officialReference:
          'Code général des impôts (CGI) — Art. 197 (Loi n° 2025-127 du 14 février 2025 de finances pour 2025)',
        normativeExcerpt:
          'Tranches 2025 (revenus 2024) pour 1 part : 0 % jusqu’à 11 497 € ; 11 % de 11 498 € à 29 315 € ; 30 % de 29 316 € à 83 823 € ; 41 % de 83 824 € à 180 294 € ; 45 % au-delà de 180 294 €. Décote célibataire : seuil 1 964 € (forfait 889 €). Décote couple : seuil 3 248 € (forfait 1 470 €).',
        plainFrenchSummary:
          'Barème applicable en 2025 sur les revenus perçus en 2024 avant la revalorisation de +0,9 % de la loi de finances pour 2026.',
        changeReason:
          'Revalorisation annuelle des tranches du barème de l’impôt sur le revenu et des seuils de décote en Loi de finances pour 2026 (+0,9 %).',
      },
    ],
    normativeExcerpt:
      'CGI Art. 197 I-1° : L’impôt est calculé en appliquant à la fraction de chaque part de revenu qui n’excède pas 11 600 € le taux de 0 % ; de 11 601 € à 29 579 € : 11 % ; de 29 580 € à 84 577 € : 30 % ; de 84 578 € à 181 917 € : 41 % ; supérieur à 181 917 € : 45 %. Art. 197 I-4° (Décote) : Lorsque le montant de l’impôt brut est inférieur à 1 982 € (célibataire, divorcé, veuf) ou 3 277 € (imposition commune), la différence entre 897 € (ou 1 483 €) et 45,25 % de l’impôt brut est déduite.',
    plainFrenchSummary:
      'En France, l’impôt sur le revenu fonctionne par tranches progressives : votre revenu n’est jamais imposé en totalité au taux le plus élevé. Pour 1 part fiscale en 2026 (sur les revenus 2025), la tranche jusqu’à 11 600 € est à 0 %, de 11 601 € à 29 579 € à 11 %, de 29 580 € à 84 577 € à 30 %, de 84 578 € à 181 917 € à 41 %, et au-delà de 181 917 € à 45 %. Si votre impôt brut est modeste, la décote le réduit automatiquement.',
    fiscaliqEducationalNotes:
      'Ne confondez jamais votre Tranche Marginale d’Imposition (TMI, ex. 11 % ou 30 %) avec votre taux moyen réel d’imposition, toujours nettement inférieur grâce à la première tranche à 0 % et à la décote.',
    whyItApplies:
      'S’applique à tous les foyers fiscaux résidant en France pour le calcul de l’impôt 2026 sur les revenus perçus en 2025.',
    eligibilityConditions: [
      'Être fiscalement domicilié en France (ou percevoir des revenus de source française soumis au barème).',
      'Pour la décote 2026 : l’impôt brut doit être inférieur à 1 982 € pour une personne seule (décote = 897 € − 45,25 % × impôt brut) ou 3 277 € pour un couple marié ou pacsé (décote = 1 483 € − 45,25 % × impôt brut).',
      'Seuil de non-recouvrement (CGI Art. 1657-1 bis) : l’impôt n’est pas mis en recouvrement s’il est inférieur à 61 €.',
    ],
    exclusionsAndLimits: [
      'La tranche marginale d’imposition (TMI) ne s’applique qu’à la fraction de revenu qui dépasse le seuil de la tranche, jamais à la totalité du salaire.',
      'Les revenus soumis au prélèvement forfaitaire unique (PFU / flat tax de 30 %) ne passent pas par le barème progressif sauf option globale pour le barème (case 2OP).',
    ],
    declarationBoxes: ['1AJ', '1BJ', '2OP'],
    explainedTerms: [
      {
        term: 'Tranche marginale d’imposition (TMI)',
        plainExplanation:
          'C’est le taux d’imposition appliqué uniquement sur la dernière tranche de votre revenu (par exemple 11 % ou 30 %). Si vous gagnez 100 € supplémentaires imposables, ils seront taxés à ce taux.',
      },
      {
        term: 'Taux moyen d’imposition',
        plainExplanation:
          'C’est le pourcentage réel que représente votre impôt final par rapport à l’ensemble de votre revenu net imposable. Il est toujours beaucoup plus bas que votre TMI.',
      },
      {
        term: 'Décote',
        plainExplanation:
          'Une réduction automatique accordée aux contribuables dont l’impôt brut est faible, afin d’adoucir l’entrée dans l’impôt.',
      },
    ],
    simpleExample:
      'Pour un célibataire (1 part) ayant un revenu net imposable de 24 000 € en 2026 : les premiers 11 600 € sont taxés à 0 % (0 €), et la tranche de 11 600 € à 24 000 € (soit 12 400 €) est taxée à 11 %, soit 1 364 € d’impôt brut. Comme 1 364 € est inférieur au seuil de décote de 1 982 €, la décote réduit cet impôt de 280 € (897 € − 45,25 % × 1 364 €), ramenant l’impôt à 1 084 € (taux moyen réel de 4,5 %, bien que la TMI soit de 11 %).',
    copyrightAndAccessNotice:
      'Source publique officielle Légifrance / DILA — Réutilisation libre sous Licence Ouverte Etalab 2.0 avec mention de la source et de la date de mise à jour.',
    ingestionMethod: 'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-IR-01)',
    reviewNotes: 'Seuils vérifiés par rapport à l’article 197 du CGI consolidé pour les revenus 2025.',
    keywords: [
      'barème',
      'impôt sur le revenu',
      'tranche',
      'tmi',
      'taux moyen',
      'décote',
      '11%',
      '30%',
      '41%',
      '45%',
      'combien payer',
      'seuil',
      'imposable',
      '197',
    ],
  },
  {
    id: 'doc-ir-bareme-decote-2025',
    title: 'Barème progressif de l’impôt sur le revenu 2025 (revenus 2024) et décote — Version historique de référence',
    domain: 'IMPOT_REVENU_BAREME',
    topic: 'IMPOT_REVENU_BAREME',
    publisher: 'Legifrance',
    authority: 'impots.gouv.fr',
    normativeTier: 'LEGISLATION_CGI_LOI',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference:
      'Code général des impôts (CGI) — Art. 197 (Loi n° 2025-127 du 14 février 2025 de finances pour 2025)',
    officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F1419',
    sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F1419',
    publicationDate: '2025-02-15',
    modificationDate: '2025-04-10',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2024,
    applicableTaxYear: 2025,
    effectiveDate: '2025-01-01',
    effectiveFromDate: '2025-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 1,
    historicalVersions: [],
    normativeExcerpt:
      'CGI Art. 197 (version applicable aux revenus 2024) : 0 % jusqu’à 11 497 € ; 11 % de 11 498 € à 29 315 € ; 30 % de 29 316 € à 83 823 € ; 41 % de 83 824 € à 180 294 € ; 45 % au-delà de 180 294 €. Plafond du quotient familial : 1 791 € par demi-part.',
    plainFrenchSummary:
      'Pour l’imposition 2025 des revenus perçus en 2024 (pour 1 part fiscale) : 0 % jusqu’à 11 497 €, 11 % de 11 498 € à 29 315 €, 30 % de 29 316 € à 83 823 €, 41 % de 83 824 € à 180 294 €, et 45 % au-delà de 180 294 €.',
    fiscaliqEducationalNotes:
      'Conservé dans la base active pour permettre la vérification des avis d’impôt 2025 (sur revenus 2024) et les comparaisons pluriannuelles.',
    whyItApplies:
      'S’applique aux revenus perçus en 2024 déclarés au printemps 2025 (avis d’impôt 2025).',
    eligibilityConditions: [
      'Décote 2025 personne seule : impôt brut inférieur à 1 964 € (forfait 889 € − 45,25 % × impôt brut).',
      'Décote 2025 couple marié ou pacsé : impôt brut inférieur à 3 248 € (forfait 1 470 € − 45,25 % × impôt brut).',
    ],
    exclusionsAndLimits: [
      'Plafond du quotient familial 2025 : 1 791 € par demi-part supplémentaire.',
    ],
    declarationBoxes: ['1AJ', '1BJ'],
    explainedTerms: [
      {
        term: 'Avis d’impôt 2025',
        plainExplanation:
          'Document récapitulatif établi à l’été 2025 portant sur vos revenus de l’année 2024.',
      },
    ],
    simpleExample:
      'En 2025 (revenus 2024), le seuil d’entrée dans la tranche à 11 % était fixé à 11 497 € par part contre 11 600 € en 2026.',
    copyrightAndAccessNotice:
      'Source publique officielle Légifrance / Service-Public.fr — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2025-IR-01)',
    reviewNotes: 'Version de référence pour les revenus 2024 préservée intégralement.',
    keywords: ['barème 2025', 'revenus 2024', 'tranche 2025', '11497', '29315', 'décote 2025'],
  },

  // ==========================================================================
  // 2. COMPOSITION DU FOYER FISCAL (Mariage, PACS, Concubinage, Rattachement)
  // ==========================================================================
  {
    id: 'doc-composition-foyer-fiscal-2026',
    title: 'Composition du foyer fiscal : Mariage, PACS, Concubinage, Divorce et Rattachement des enfants majeurs',
    domain: 'QUOTIENT_FAMILIAL_ENFANTS',
    topic: 'COMPOSITION_FOYER',
    publisher: 'BOFiP',
    authority: 'BOFiP',
    normativeTier: 'DOCTRINE_BOFIP',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference: 'CGI — Art. 6 (Imposition par foyer fiscal) & BOI-IR-CHAMP-20-10 / BOI-IR-CHAMP-20-20',
    officialUrl: 'https://bofip.impots.gouv.fr/bofip/1120-PGP.html/identifiant=BOI-IR-CHAMP-20-10',
    sourceUrl: 'https://www.impots.gouv.fr/particulier/questions/quelle-est-la-composition-du-foyer-fiscal',
    publicationDate: '2025-06-18',
    modificationDate: '2026-01-15',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 1,
    historicalVersions: [],
    normativeExcerpt:
      'CGI Art. 6-1 : Chaque contribuable est imposable à l’impôt sur le revenu, tant en raison de ses bénéfices et revenus personnels que de ceux de ses enfants et des personnes considérés comme étant à sa charge au sens des articles 196 et 196 B. Les personnes mariées et les partenaires liés par un PACS sont soumis à une imposition commune.',
    plainFrenchSummary:
      'L’impôt sur le revenu est calculé à l’échelle du « foyer fiscal » et non par individu isolé. Les couples mariés ou pacsés forment un seul foyer fiscal (imposition commune sur 1 déclaration, sauf option pour l’imposition séparée la seule année du mariage/PACS ou en cas de séparation de biens sans vie commune). À l’inverse, les concubins (en union libre) constituent toujours deux foyers fiscaux distincts et déposent deux déclarations séparées.',
    fiscaliqEducationalNotes:
      'Pour un enfant étudiant de moins de 25 ans, comparez toujours le gain du rattachement au foyer (+0,5 ou +1 part plafonnée à 1 807 €) avec la déduction d’une pension alimentaire (jusqu’à 6 794 € en 2026).',
    whyItApplies:
      'Détermine qui déclare ensemble, comment sont rattachés les enfants mineurs ou majeurs étudiants (< 21 ans ou < 25 ans étudiants), et comment sont traités le mariage, le PACS ou le divorce en cours d’année.',
    eligibilityConditions: [
      'Mariage ou PACS : imposition commune de plein droit, avec option possible uniquement l’année de conclusion du mariage/PACS pour déposer deux déclarations séparées sur l’année entière.',
      'Divorce, rupture de PACS ou séparation : chacun dépose une déclaration individuelle pour l’ensemble de l’année au cours de laquelle intervient la séparation.',
      'Rattachement d’un enfant majeur (CGI Art. 6-3) : âgé de moins de 21 ans au 1er janvier de l’année des revenus, ou de moins de 25 ans s’il poursuit des études, ou sans limite d’âge s’il est infirme.',
    ],
    exclusionsAndLimits: [
      'Les concubins ne peuvent jamais souscrire une déclaration commune d’impôt sur le revenu.',
      'Si un enfant majeur rattaché a perçu des revenus imposables (hors exonérations stages/jobs étudiants jusqu’à 3 SMIC mensuels), ces revenus doivent être ajoutés à ceux du foyer des parents.',
    ],
    declarationBoxes: ['Case M', 'Case O', 'Case C', 'Case D', 'Case J'],
    explainedTerms: [
      {
        term: 'Foyer fiscal',
        plainExplanation:
          'Ensemble des personnes (vous, votre conjoint ou partenaire de PACS, et vos personnes à charge) inscrites sur une même déclaration de revenus.',
      },
      {
        term: 'Exonération job étudiant / stage',
        plainExplanation:
          'Les salaires des étudiants de 25 ans ou moins et les gratifications de stage sont exonérés d’impôt jusqu’à 3 SMIC mensuels bruts par an (seul le surplus est imposable).',
      },
    ],
    simpleExample:
      'Si vous vivez en union libre (concubinage) avec 1 enfant commun, chacun remplit sa propre déclaration (1 part de base) et un seul des deux parents (ou les deux à parts égales s’ils assument la charge commune) rattache l’enfant.',
    copyrightAndAccessNotice:
      'Doctrine administrative officielle BOFiP-Impôts (DGFiP) — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-FOY-01)',
    reviewNotes: 'Conforme à l’article 6 du CGI et à la doctrine BOI-IR-CHAMP-20.',
    keywords: [
      'foyer fiscal',
      'composition du foyer',
      'mariage',
      'pacs',
      'concubinage',
      'union libre',
      'divorce',
      'séparation',
      'enfant majeur',
      'rattachement',
      'étudiant',
      'stage',
      'job étudiant',
      'article 6',
    ],
  },

  // ==========================================================================
  // 3. QUOTIENT FAMILIAL, PARTS FISCALES, ENFANTS & PARENT ISOLÉ (CASE T)
  // ==========================================================================
  {
    id: 'doc-quotient-familial-parts-2026',
    title: 'Quotient familial, nombre de parts fiscales, enfants à charge et plafonnement (2026)',
    domain: 'QUOTIENT_FAMILIAL_ENFANTS',
    topic: 'QUOTIENT_FAMILIAL_PARTS',
    publisher: 'Service-Public Particuliers',
    authority: 'Service-Public.fr',
    normativeTier: 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference: 'CGI — Art. 194, 195 et 197-I-2° (Plafonnement du quotient familial)',
    officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2705',
    sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F2705',
    publicationDate: '2026-01-12',
    modificationDate: '2026-04-09',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 2,
    historicalVersions: [
      {
        versionNumber: 1,
        applicableIncomeYear: 2024,
        applicableTaxYear: 2025,
        effectiveDate: '2025-01-01',
        publicationDate: '2025-02-15',
        modificationDate: '2025-04-10',
        archivedDate: '2026-01-01',
        officialReference: 'CGI — Art. 197-I-2° (Loi de finances pour 2025)',
        normativeExcerpt:
          'Plafond de l’avantage en impôt procuré par chaque demi-part additionnelle en 2025 (revenus 2024) : 1 791 € (895,50 € par quart de part en résidence alternée). Plafond parent isolé (Case T) pour le 1er enfant : 4 224 €.',
        plainFrenchSummary:
          'Plafonds du quotient familial applicables en 2025 sur les revenus 2024.',
        changeReason: 'Revalorisation légale des plafonds du quotient familial de +0,9 % en 2026 (passage de 1 791 € à 1 807 € par demi-part).',
      },
    ],
    normativeExcerpt:
      'CGI Art. 197-I-2° : La réduction d’impôt résultant de l’application du quotient familial ne peut excéder 1 807 € par demi-part s’ajoutant à une part pour les contribuables célibataires, divorcés ou veufs et à deux parts pour les contribuables soumis à une imposition commune. Pour les contribuables vivant seuls (Art. 194-II / Case T), cet avantage ne peut excéder 4 262 € pour la part entière accordée au titre du premier enfant à charge.',
    plainFrenchSummary:
      'Le quotient familial adapte l’impôt à la taille de votre foyer en divisant votre revenu imposable par un nombre de parts : 1 part pour une personne seule, 2 parts pour un couple marié ou pacsé. Les deux premiers enfants à charge donnent droit à +0,5 part chacun (soit +0,25 part en garde alternée), et chaque enfant à partir du 3e donne droit à +1 part entière (+0,5 en garde alternée). L’avantage fiscal procuré par chaque demi-part supplémentaire est plafonné par la loi.',
    fiscaliqEducationalNotes:
      'Le plafonnement du quotient familial est calculé automatiquement par l’administration : vous n’avez aucun calcul manuel à reporter, mais il explique pourquoi la baisse d’impôt liée à un enfant ne dépasse jamais 1 807 € par demi-part.',
    whyItApplies:
      'Permet de déterminer le nombre de parts fiscales du foyer et de vérifier si le plafonnement légal du quotient familial limite le gain lié aux enfants.',
    eligibilityConditions: [
      'Enfants mineurs (moins de 18 ans au 1er janvier de l’année d’imposition) ou enfants infirmes quel que soit leur âge.',
      'Enfants majeurs rattachés au foyer fiscal (moins de 21 ans, ou moins de 25 ans s’ils poursuivent des études).',
      'Parent isolé (Case T) : vivre seul(e) au 1er janvier de l’année d’imposition et assumer à titre exclusif ou principal la charge d’au moins un enfant. Accorde une demi-part supplémentaire pour le 1er enfant (soit 2 parts pour un parent isolé avec 1 enfant en résidence exclusive).',
    ],
    exclusionsAndLimits: [
      'En 2026 (revenus 2025), l’économie d’impôt procurée par chaque demi-part supplémentaire est plafonnée à 1 807 € (soit 903,50 € par quart de part en garde alternée).',
      'Pour un parent isolé (Case T), le plafond spécifique pour la première part entière accordée au titre du 1er enfant est de 4 262 € en 2026.',
      'Le concubinage (union libre) ne permet pas une imposition commune : chaque concubin dépose sa propre déclaration (1 part de base chacun) et les enfants ne peuvent être comptés qu’une seule fois.',
      'Si vous vivez en concubinage, vous ne pouvez pas cocher la case T (parent isolé).',
    ],
    declarationBoxes: ['Case M', 'Case O', 'Case C', 'Case D', 'Case F', 'Case H', 'Case T'],
    explainedTerms: [
      {
        term: 'Quotient familial',
        plainExplanation:
          'C’est le résultat de la division de votre revenu net imposable par votre nombre de parts fiscales. C’est ce montant (pour 1 part) qui est soumis au barème progressif.',
      },
      {
        term: 'Plafonnement du quotient familial',
        plainExplanation:
          'Règle légale qui limite la baisse d’impôt maximale que peut procurer chaque demi-part liée aux enfants (1 807 € par demi-part en 2026).',
      },
      {
        term: 'Case T (Parent isolé)',
        plainExplanation:
          'Case de la déclaration 2042 réservée au parent célibataire, divorcé ou séparé qui vit seul au 1er janvier et élève au moins un enfant à charge.',
      },
    ],
    simpleExample:
      'Un couple marié avec 2 enfants dispose de 3 parts (2 parts pour le couple + 0,5 pour le 1er enfant + 0,5 pour le 2e enfant). Si leur revenu imposable est de 60 000 €, l’administration calcule d’abord l’impôt sur 60 000 € ÷ 3 = 20 000 € par part, puis multiplie le résultat par 3, tout en vérifiant que l’économie par rapport à un couple sans enfant (2 parts) ne dépasse pas 2 × 1 807 € = 3 614 €.',
    copyrightAndAccessNotice:
      'Fiche vérifiée DILA / Service-Public Particuliers — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-QF-01)',
    reviewNotes: 'Plafonds 2026 (1 807 € et 4 262 €) contrôlés et validés.',
    keywords: [
      'part',
      'parts fiscales',
      'quotient familial',
      'enfant',
      'enfants',
      'garde alternée',
      'parent isolé',
      'case t',
      'plafonnement',
      'marié',
      'pacs',
      'concubinage',
      'demi-part',
      'rattachement',
      'étudiant',
      '194',
    ],
  },

  // ==========================================================================
  // 4. SALAIRES, TRAITEMENTS & FRAIS PROFESSIONNELS (10 % vs Frais réels)
  // ==========================================================================
  {
    id: 'doc-frais-professionnels-10pct-vs-reels-2026',
    title: 'Salaires, traitements et frais professionnels : Abattement forfaitaire de 10 % ou Frais réels (2026)',
    domain: 'FRAIS_PROFESSIONNELS',
    topic: 'SALAIRES_TRAITEMENTS',
    publisher: 'BOFiP',
    authority: 'impots.gouv.fr',
    normativeTier: 'DOCTRINE_BOFIP',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference: 'CGI — Art. 83-3° & BOI-RSA-BASE-30-50',
    officialUrl: 'https://bofip.impots.gouv.fr/bofip/2161-PGP.html/identifiant=BOI-RSA-BASE-30-50',
    sourceUrl: 'https://www.impots.gouv.fr/particulier/frais-de-transport',
    publicationDate: '2026-01-20',
    modificationDate: '2026-03-05',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 2,
    historicalVersions: [
      {
        versionNumber: 1,
        applicableIncomeYear: 2024,
        applicableTaxYear: 2025,
        effectiveDate: '2025-01-01',
        publicationDate: '2025-02-15',
        modificationDate: '2025-03-10',
        archivedDate: '2026-01-01',
        officialReference: 'CGI — Art. 83-3° ( Déclaration 2025 des revenus 2024 )',
        normativeExcerpt:
          'Plancher de la déduction forfaitaire de 10 % en 2025 (revenus 2024) : 504 € par salarié. Plafond : 14 426 € par salarié.',
        plainFrenchSummary:
          'Limites de l’abattement de 10 % sur les salaires applicables pour l’imposition 2025 des revenus 2024.',
        changeReason: 'Revalorisation du plancher (509 €) et du plafond (14 555 €) de la déduction forfaitaire de 10 % pour 2026.',
      },
    ],
    normativeExcerpt:
      'CGI Art. 83-3° : Les frais inhérents à la fonction ou à l’emploi sont déduits de plein droit sous la forme d’une déduction forfaitaire de 10 % qui ne peut être inférieure à 509 € ni supérieure à 14 555 € pour l’imposition des revenus de 2025. Les bénéficiaires de traitements et salaires sont également admis à justifier du montant de leurs frais réels (cases 1AK à 1DK).',
    plainFrenchSummary:
      'Pour tenir compte de vos dépenses professionnelles (transports, repas), l’administration fiscale applique automatiquement un abattement forfaitaire de 10 % sur vos salaires nets imposables déclarés. En 2026 (sur les revenus 2025), cet abattement est d’au moins 509 € et ne peut pas dépasser 14 555 € par salarié du foyer. Si vos dépenses réelles justifiées dépassent ce montant de 10 %, vous pouvez opter pour la déduction de vos frais réels.',
    fiscaliqEducationalNotes:
      'Chaque membre d’un couple marié ou pacsé peut choisir indépendamment : l’un peut conserver les 10 % automatiques (case 1AJ) tandis que l’autre opte pour les frais réels (case 1BK).',
    whyItApplies:
      'Permet à chaque salarié du foyer de choisir le mode de déduction le plus avantageux (10 % automatique ou frais réels justifiés).',
    eligibilityConditions: [
      'Les dépenses déclarées aux frais réels doivent être directement nécessitées par l’exercice de la profession salariée, payées au cours de l’année des revenus, et appuyées par des justificatifs conservés pendant 3 ans.',
      'Trajets domicile-travail : déductibles dans la limite de 40 km (aller simple) sauf circonstances particulières liées à l’emploi ou à la situation familiale (80 km aller-retour maximum par défaut).',
      'Chaque membre du couple peut choisir indépendamment l’abattement de 10 % ou les frais réels.',
    ],
    exclusionsAndLimits: [
      'En optant pour les frais réels, vous devez réintégrer dans votre salaire imposable les remboursements de frais versés par votre employeur (indemnités kilométriques, prise en charge transport).',
      'Plafond de l’abattement de 10 % des salaires en 2026 : 14 555 € (14 426 € en 2025). Plancher : 509 € (504 € en 2025).',
    ],
    declarationBoxes: ['1AJ', '1BJ', '1AK', '1BK'],
    explainedTerms: [
      {
        term: 'Abattement forfaitaire de 10 %',
        plainExplanation:
          'Réduction automatique de 10 % appliquée par les impôts sur votre salaire net imposable avant de calculer votre impôt, sans aucun justificatif à fournir.',
      },
      {
        term: 'Frais réels (cases 1AK / 1BK)',
        plainExplanation:
          'Option permettant de remplacer l’abattement de 10 % par le montant exact de vos dépenses professionnelles (barème kilométrique, repas hors domicile, télétravail).',
      },
    ],
    simpleExample:
      'Si votre salaire net imposable annuel est de 32 000 €, votre abattement automatique de 10 % est de 3 200 €. Si vos frais réels de transport et de repas justifiés s’élèvent à 4 800 € sur l’année, opter pour les frais réels diminue votre revenu imposable de 1 600 € supplémentaires (soit 176 € d’impôt en moins si vous êtes dans la tranche à 11 %).',
    copyrightAndAccessNotice:
      'Doctrine officielle BOFiP-Impôts & notices impots.gouv.fr — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-SAL-01)',
    reviewNotes: 'Plafond 14 555 € et plancher 509 € vérifiés pour les revenus 2025.',
    keywords: [
      'frais réels',
      'abattement 10%',
      '10 %',
      'frais professionnels',
      'barème kilométrique',
      'kilomètres',
      'trajet domicile travail',
      'repas',
      'télétravail',
      '1ak',
      '1bk',
      '14555',
      '83',
    ],
  },

  // ==========================================================================
  // 5. PENSIONS DE RETRAITE & ABATTEMENT SPÉCIFIQUE DE 10 %
  // ==========================================================================
  {
    id: 'doc-pensions-retraite-abattement-2026',
    title: 'Fiscalité des pensions de retraite et abattement spécifique de 10 % par foyer (2026)',
    domain: 'RETRAITE_PENSIONS',
    topic: 'PENSIONS_RETRAITES',
    publisher: 'Service-Public Particuliers',
    authority: 'Service-Public.fr',
    normativeTier: 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference:
      'CGI — Art. 79 et Art. 158-5-a (Abattement de 10 % sur les pensions et retraites) & Art. 195 (Demi-part anciens combattants / invalidité)',
    officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/F417',
    sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/F417',
    publicationDate: '2026-01-14',
    modificationDate: '2026-04-02',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 2,
    historicalVersions: [
      {
        versionNumber: 1,
        applicableIncomeYear: 2024,
        applicableTaxYear: 2025,
        effectiveDate: '2025-01-01',
        publicationDate: '2025-02-15',
        modificationDate: '2025-04-05',
        archivedDate: '2026-01-01',
        officialReference: 'CGI — Art. 158-5-a (Revenus 2024)',
        normativeExcerpt:
          'Abattement de 10 % sur les pensions et retraites perçues en 2024 : plancher de 450 € par pensionné et plafond global de 4 399 € par foyer fiscal.',
        plainFrenchSummary:
          'Plafond de 4 399 € par foyer fiscal applicable en 2025 sur les pensions perçues en 2024.',
        changeReason: 'Revalorisation du plafond par foyer (4 439 €) et du plancher par pensionné (454 €) pour les revenus 2025.',
      },
    ],
    normativeExcerpt:
      'CGI Art. 158-5-a : Les pensions et retraites font l’objet d’un abattement de 10 % qui ne peut être inférieur à 454 € par titulaire de pension ni excéder 4 439 € pour l’ensemble du foyer fiscal au titre des revenus de l’année 2025.',
    plainFrenchSummary:
      'Les pensions de retraite de base et complémentaires (ainsi que les pensions alimentaires perçues) sont soumises à l’impôt sur le revenu après un abattement automatique de 10 %. Attention : contrairement à l’abattement de 10 % des salaires dont le plafond est calculé par personne, le plafond de l’abattement de 10 % sur les pensions de retraite s’applique pour l’ensemble du foyer fiscal (4 439 € maximum pour tout le foyer en 2026 sur les revenus 2025).',
    fiscaliqEducationalNotes:
      'Distinction essentielle entre salarié et retraité : le plafond de 14 555 € des salaires est individuel, alors que le plafond de 4 439 € des retraites est commun à tout le foyer fiscal.',
    whyItApplies:
      'Précise le calcul exact du revenu imposable des retraités et pensionnés ainsi que les abattements liés à l’âge (> 65 ans) ou à l’invalidité.',
    eligibilityConditions: [
      'Plancher de l’abattement de 10 % sur les pensions en 2026 : 454 € par pensionné du foyer (sans excéder le montant de la pension).',
      'Plafond de l’abattement de 10 % sur les pensions en 2026 : 4 439 € pour l’ensemble du foyer fiscal (4 399 € en 2025).',
      'Abattement spécial pour les personnes âgées de plus de 65 ans au 31 décembre ou invalides (CGI Art. 157 bis) : accordé automatiquement sous condition de revenu net global modeste.',
    ],
    exclusionsAndLimits: [
      'Les retraités ne peuvent pas opter pour la déduction des frais professionnels réels sur leurs pensions de retraite.',
      'L’Allocation de solidarité aux personnes âgées (ASPA) et la Majoration pour tierce personne (MTP) sont exonérées d’impôt sur le revenu.',
    ],
    declarationBoxes: ['1AS', '1BS', 'Case P', 'Case F'],
    explainedTerms: [
      {
        term: 'Plafond par foyer fiscal (4 439 €)',
        plainExplanation:
          'Pour un couple de retraités, la réduction de 10 % sur l’addition de leurs deux pensions de retraite est plafonnée au total à 4 439 € pour le couple entier.',
      },
    ],
    simpleExample:
      'Un couple de retraités perçoit au total 50 000 € de pensions nettes imposables sur l’année. 10 % représenterait 5 000 €, mais comme le plafond par foyer est de 4 439 € en 2026, l’abattement retenu est de 4 439 € et la base imposable du couple est de 45 561 €.',
    copyrightAndAccessNotice:
      'Fiche officielle Service-Public Particuliers (DILA) — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-RET-01)',
    reviewNotes: 'Plafond foyer 4 439 € et plancher 454 € vérifiés.',
    keywords: [
      'retraite',
      'retraité',
      'pension',
      'pensions de retraite',
      '1as',
      '1bs',
      '4439',
      'invalidité',
      '65 ans',
      'abattement retraite',
      '158',
    ],
  },

  // ==========================================================================
  // 6. REVENUS FONCIERS & LOCATIFS (Micro-foncier vs Régime réel & Déficit)
  // ==========================================================================
  {
    id: 'doc-revenus-fonciers-locatifs-2026',
    title: 'Revenus locatifs des particuliers : Location nue (Micro-foncier vs Régime réel) et Location meublée (LMNP)',
    domain: 'REVENUS_FONCIERS_LOCATIFS',
    topic: 'REVENUS_FONCIERS_LOCATIFS',
    publisher: 'impots.gouv.fr',
    authority: 'impots.gouv.fr',
    normativeTier: 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference:
      'CGI — Art. 28, 31, 32 (Revenus fonciers) & Art. 50-0 (Micro-BIC Meublé) & Art. 156-I-3° (Déficit foncier)',
    officialUrl: 'https://www.impots.gouv.fr/particulier/les-revenus-fonciers',
    sourceUrl: 'https://www.impots.gouv.fr/particulier/les-revenus-fonciers',
    publicationDate: '2026-02-01',
    modificationDate: '2026-04-11',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 1,
    historicalVersions: [],
    normativeExcerpt:
      'CGI Art. 32 : Les contribuables dont le revenu brut foncier annuel n’excède pas 15 000 € sont soumis de plein droit au régime micro-foncier (abattement forfaitaire de 30 %). Art. 156-I-3° : Les déficits fonciers résultant de dépenses autres que les intérêts d’emprunt s’imputent sur le revenu global dans la limite de 10 700 €.',
    plainFrenchSummary:
      'Si vous louez un logement non meublé (location nue), vos loyers hors charges sont imposés dans la catégorie des revenus fonciers. Si vos loyers bruts annuels ne dépassent pas 15 000 €, le régime micro-foncier s’applique automatiquement avec un abattement forfaitaire de 30 % (vous n’êtes imposé que sur 70 % des loyers). Si vos charges réelles (travaux d’entretien/réparation, taxe foncière, assurance, frais de gestion, intérêts d’emprunt) dépassent 30 % des loyers, ou si vos loyers dépassent 15 000 €, le régime réel (formulaire 2044) permet de déduire vos charges exactes.',
    fiscaliqEducationalNotes:
      'N’oubliez pas que les revenus fonciers nets supportent à la fois votre tranche marginale d’impôt sur le revenu (TMI) et les prélèvements sociaux au taux de 17,2 %.',
    whyItApplies:
      'Guide les propriétaires bailleurs particuliers dans le choix entre le micro-foncier (abattement de 30 %) et le régime réel (déduction des travaux et déficit foncier), ainsi que la distinction avec la location meublée.',
    eligibilityConditions: [
      'Régime micro-foncier (CGI Art. 32 — case 4BE) : recettes brutes foncières annuelles du foyer ≤ 15 000 € et absence de biens soumis à certains régimes spéciaux. Abattement automatique de 30 %.',
      'Régime réel foncier (CGI Art. 31 — déclaration 2044 et report case 4BA / 4BB / 4BC) : obligatoire au-delà de 15 000 € de loyers bruts ou sur option irrévocable pendant 3 ans.',
      'Déficit foncier (CGI Art. 156-I-3°) : si vos charges déductibles (hors intérêts d’emprunt) dépassent vos loyers au régime réel, le déficit est imputable sur votre revenu global dans la limite de 10 700 € par an (le surplus et la fraction liée aux intérêts d’emprunt sont reportables sur les revenus fonciers des 10 années suivantes).',
    ],
    exclusionsAndLimits: [
      'En cas d’imputation d’un déficit foncier sur votre revenu global, vous devez continuer à louer le bien jusqu’au 31 décembre de la 3e année qui suit l’imputation (CGI Art. 156-I-3°).',
      'Les revenus fonciers nets sont soumis à la fois au barème progressif de l’impôt sur le revenu (selon votre TMI) et aux prélèvements sociaux au taux global de 17,2 %.',
      'La location meublée (LMNP) ne relève pas des revenus fonciers mais des Bénéfices Industriels et Commerciaux (BIC — déclaration 2042 C PRO).',
    ],
    declarationBoxes: ['4BE', '4BA', '4BB', '4BC'],
    explainedTerms: [
      {
        term: 'Micro-foncier (case 4BE)',
        plainExplanation:
          'Régime simplifié pour les loyers non meublés jusqu’à 15 000 €/an : les impôts appliquent automatiquement une réduction de 30 % pour couvrir toutes vos charges.',
      },
      {
        term: 'Déficit foncier',
        plainExplanation:
          'Situation au régime réel où vos charges déductibles (travaux, taxe foncière, gestion) sont supérieures aux loyers encaissés : ce déficit peut réduire votre revenu imposable global jusqu’à 10 700 €/an.',
      },
    ],
    simpleExample:
      'Vous encaissez 10 000 € de loyers hors charges. En micro-foncier, vous êtes imposé sur 7 000 € (après abattement de 30 %). Si vous avez réalisé 6 000 € de travaux de rénovation et payé 2 000 € de taxe foncière et intérêts, vos charges réelles (8 000 €) ramènent votre revenu foncier imposable à 2 000 € au régime réel.',
    copyrightAndAccessNotice:
      'Documentation officielle DGFiP (impots.gouv.fr) — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-FON-01)',
    reviewNotes: 'Seuils 15 000 € micro-foncier et 10 700 € déficit foncier de droit commun confirmés.',
    keywords: [
      'loyer',
      'locatif',
      'revenus fonciers',
      'micro-foncier',
      'régime réel',
      'déficit foncier',
      '2044',
      '4be',
      '4ba',
      'meublé',
      'lmnp',
      'propriétaire',
      'bailleur',
      'travaux',
      '15000',
      '10700',
    ],
  },

  // ==========================================================================
  // 7. DÉDUCTIONS DU REVENU GLOBAL : ÉPARGNE RETRAITE (PER) & PENSIONS ALIMENTAIRES
  // ==========================================================================
  {
    id: 'doc-deductions-per-pension-alimentaire-2026',
    title: 'Déductions du revenu global : Plan d’Épargne Retraite (PER) et Pensions alimentaires versées (2026)',
    domain: 'DEDUCTIONS_EPARGNE_PENSIONS',
    topic: 'DEDUCTIONS_REVENU_GLOBAL',
    publisher: 'BOFiP',
    authority: 'impots.gouv.fr',
    normativeTier: 'DOCTRINE_BOFIP',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference:
      'CGI — Art. 163 quatervicies (Épargne retraite PER) & Art. 156-II-2° (Pensions alimentaires) & BOI-IR-BASE-20-30',
    officialUrl: 'https://www.impots.gouv.fr/particulier/epargne-retraite',
    sourceUrl: 'https://www.impots.gouv.fr/particulier/epargne-retraite',
    publicationDate: '2026-01-19',
    modificationDate: '2026-04-08',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 2,
    historicalVersions: [
      {
        versionNumber: 1,
        applicableIncomeYear: 2024,
        applicableTaxYear: 2025,
        effectiveDate: '2025-01-01',
        publicationDate: '2025-02-15',
        modificationDate: '2025-04-10',
        archivedDate: '2026-01-01',
        officialReference: 'CGI — Art. 156-II-2° et Art. 163 quatervicies (Revenus 2024)',
        normativeExcerpt:
          'Plafond de déduction de la pension alimentaire versée à un enfant majeur non rattaché en 2025 (revenus 2024) : 6 794 € par enfant (forfait hébergement/nourriture sans justificatif : 4 039 €).',
        plainFrenchSummary:
          'Plafonds de déduction des pensions alimentaires et versements PER pour les revenus 2024.',
        changeReason: 'Actualisation annuelle des plafonds d’épargne retraite (plancher PASS) et maintien des règles de non-cumul rattachement / pension.',
      },
    ],
    normativeExcerpt:
      'CGI Art. 156-II-2° : Le contribuable ne peut opérer de déduction simultanément au titre de la pension alimentaire et du rattachement d’un enfant majeur. La déduction de la pension versée à un enfant majeur est limitée au plafond légal par enfant. Art. 163 quatervicies : Les cotisations versées sur un PER sont déductibles dans la limite de 10 % des revenus professionnels nets de frais (plancher 10 % du PASS, plafond 10 % de 8 PASS) majoré des plafonds non utilisés des 3 années précédentes.',
    plainFrenchSummary:
      'Contrairement à une réduction ou un crédit d’impôt, une déduction fiscale vient diminuer votre revenu imposable avant l’application du barème progressif. L’économie d’impôt dépend donc directement de votre tranche marginale d’imposition (TMI) : si votre TMI est de 30 %, déduire 1 000 € réduit votre impôt de 300 € ; si votre TMI est de 0 % (non imposable), la déduction ne procure aucune économie d’impôt.',
    fiscaliqEducationalNotes:
      'Vérifiez toujours votre « Plafond épargne retraite » inscrit en dernière page de votre avis d’impôt avant de verser sur un PER.',
    whyItApplies:
      'Explique le mécanisme et les plafonds légaux des versements volontaires sur un PER et des pensions alimentaires versées à un enfant ou ex-conjoint.',
    eligibilityConditions: [
      'Plan d’Épargne Retraite (PER — cases 6NS / 6NT) : les versements volontaires sont déductibles dans la limite du disponible fiscal indiqué sur votre avis d’impôt (10 % des revenus professionnels nets de frais, avec un plancher de 4 637 € et un plafond de 37 094 € en 2026, plus les plafonds non utilisés des 3 années précédentes). Possibilité de mutualiser les plafonds au sein d’un couple marié ou pacsé (case 6QR).',
      'Pension alimentaire versée à un enfant majeur non rattaché au foyer fiscal (CGI Art. 156-II-2° — cases 6EL / 6EM) : déductible si l’enfant est dans le besoin, dans la limite de 6 794 € par enfant (forfait hébergement/nourriture de 4 039 € sans justificatif si l’enfant vit sous votre toit toute l’année).',
      'Pension alimentaire versée pour un enfant mineur (case 6GU) : déductible uniquement pour le parent qui n’a pas la charge fiscale de l’enfant (interdit en cas de garde alternée donnant déjà droit au partage des parts).',
    ],
    exclusionsAndLimits: [
      'Vous ne pouvez jamais cumuler pour un même enfant majeur le rattachement à votre foyer fiscal (+0,5 ou +1 part) et la déduction d’une pension alimentaire : il faut choisir l’option la plus avantageuse.',
      'Le versement sur un PER n’est intéressant fiscalement à l’entrée que si votre tranche marginale (TMI) est d’au moins 11 % (et surtout 30 %, 41 % ou 45 %), car le capital et les gains seront imposés à la sortie.',
    ],
    declarationBoxes: ['6NS', '6NT', '6QR', '6EL', '6EM', '6GU'],
    explainedTerms: [
      {
        term: 'Déduction du revenu imposable',
        plainExplanation:
          'Somme soustraite de votre revenu imposable avant calcul de l’impôt. L’économie d’impôt est égale au montant déduit multiplié par votre tranche marginale (TMI).',
      },
      {
        term: 'Plafond épargne retraite',
        plainExplanation:
          'Montant maximal de cotisations PER que vous pouvez déduire de vos revenus cette année (indiqué à la fin de votre dernier avis d’impôt).',
      },
    ],
    simpleExample:
      'Si vous êtes imposé dans la tranche à 30 % et versez 3 000 € sur un PER (case 6NS), votre revenu imposable baisse de 3 000 € et votre impôt diminue de 3 000 € × 30 % = 900 €.',
    copyrightAndAccessNotice:
      'Doctrine administrative BOFiP & fiches impots.gouv.fr — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-DED-01)',
    reviewNotes: 'Règles de non-cumul rattachement/pension et plafonds PER vérifiés.',
    keywords: [
      'déduction',
      'per',
      'plan épargne retraite',
      'épargne retraite',
      'pension alimentaire',
      'enfant majeur',
      'divorce',
      '6ns',
      '6nt',
      '6el',
      '6gu',
      '6794',
      '156',
      '163',
    ],
  },

  // ==========================================================================
  // 8. RÉDUCTIONS D'IMPÔT (Dons aux associations 75 % / 66 % & Règle de non-remboursement)
  // ==========================================================================
  {
    id: 'doc-reductions-impot-dons-2026',
    title: 'Réductions d’impôt : Dons aux associations (75 % jusqu’à 1 000 € et 66 % dans la limite de 20 % du revenu)',
    domain: 'CREDITS_REDUCTIONS_IMPOT',
    topic: 'REDUCTIONS_IMPOT',
    publisher: 'economie.gouv.fr',
    authority: 'economie.gouv.fr',
    normativeTier: 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference: 'CGI — Art. 200 (Réduction d’impôt au titre des dons aux œuvres et organismes d’intérêt général)',
    officialUrl: 'https://www.economie.gouv.fr/particuliers/prelevement-a-la-source-reductions-fiscales-dons-associations',
    sourceUrl: 'https://www.economie.gouv.fr/particuliers/prelevement-a-la-source-reductions-fiscales-dons-associations',
    publicationDate: '2026-01-22',
    modificationDate: '2026-04-06',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 1,
    historicalVersions: [],
    normativeExcerpt:
      'CGI Art. 200 : Ouvrent droit à une réduction d’impôt sur le revenu égale à 66 % de leur montant les sommes prises dans la limite de 20 % du revenu imposable qui correspondent à des dons et versements effectués au profit d’œuvres ou d’organismes d’intérêt général (case 7UF). Ce taux est porté à 75 % pour les versements au profit d’organismes d’aide gratuite aux personnes en difficulté dans la limite de 1 000 € (case 7UD).',
    plainFrenchSummary:
      'Une réduction d’impôt diminue directement votre impôt brut, mais elle ne peut jamais descendre votre impôt en dessous de 0 € ni donner lieu à un remboursement par la DGFiP si vous n’êtes pas imposable. Pour les dons aux associations, l’excédent qui dépasse le plafond de 20 % du revenu imposable peut toutefois être reporté sur les 5 années suivantes.',
    fiscaliqEducationalNotes:
      'Les dons aux associations (cases 7UD et 7UF) n’entrent pas dans le plafonnement global des niches fiscales de 10 000 €.',
    whyItApplies:
      'Explique le calcul exact de la réduction d’impôt pour dons (75 % et 66 %), la règle de non-restitution aux foyers non imposables et le report sur 5 ans.',
    eligibilityConditions: [
      'Dons aux organismes d’aide aux personnes en difficulté (repas, soins, logement — case 7UD) : réduction de 75 % dans la limite de 1 000 € de dons (soit 750 € de réduction maximale). La fraction au-delà de 1 000 € bascule automatiquement au taux de 66 %.',
      'Dons aux organismes d’intérêt général ou reconnus d’utilité publique (case 7UF) : réduction de 66 % dans la limite de 20 % du revenu net imposable du foyer.',
      'Conserver le reçu fiscal officiel (Cerfa n° 11580) délivré par l’organisme bénéficiaire en cas de demande de l’administration.',
    ],
    exclusionsAndLimits: [
      'Contrairement à un crédit d’impôt, si votre réduction pour don dépasse votre impôt sur le revenu, la différence n’est pas remboursée.',
      'Seul le dépassement du plafond de 20 % du revenu imposable est reportable sur les 5 années suivantes.',
    ],
    declarationBoxes: ['7UD', '7UF', '7VA'],
    explainedTerms: [
      {
        term: 'Réduction d’impôt non restituable',
        plainExplanation:
          'Avantage fiscal qui réduit votre impôt jusqu’à 0 €, mais qui n’est jamais remboursé par virement si vous payez moins d’impôt que le montant de la réduction.',
      },
    ],
    simpleExample:
      'Si vous donnez 400 € à une association d’aide alimentaire (case 7UD), votre réduction d’impôt est de 400 € × 75 % = 300 €. Si votre impôt avant réduction était de 900 €, il passe à 600 €.',
    copyrightAndAccessNotice:
      'Publication officielle Ministère de l’Économie et des Finances (economie.gouv.fr) — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-RED-01)',
    reviewNotes: 'Plafond de 1 000 € à 75 % (Art. 200 CGI) et limite de 20 % du revenu imposable confirmés.',
    keywords: [
      'réduction d’impôt',
      'dons',
      'association',
      'fondation',
      '75%',
      '66%',
      '7ud',
      '7uf',
      'reçu fiscal',
      'intérêt général',
      'article 200',
    ],
  },

  // ==========================================================================
  // 9. CRÉDITS D'IMPÔT (Garde d'enfant < 6 ans & Emploi à domicile 50 %)
  // ==========================================================================
  {
    id: 'doc-credits-reductions-impot-2026',
    title: 'Crédits d’impôt remboursables : Garde d’enfant hors du domicile (< 6 ans) et Emploi d’un salarié à domicile (50 %)',
    domain: 'CREDITS_REDUCTIONS_IMPOT',
    topic: 'CREDITS_IMPOT',
    publisher: 'Service-Public Particuliers',
    authority: 'Service-Public.fr',
    normativeTier: 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference:
      'CGI — Art. 199 quater F (Emploi à domicile), Art. 200 quater B (Garde < 6 ans), Art. 200-0 A (Plafonnement niches 10 000 €) & Art. 1665 bis (Avance de 60 %)',
    officialUrl: 'https://www.service-public.fr/particuliers/vosdroits/N19785',
    sourceUrl: 'https://www.service-public.fr/particuliers/vosdroits/N19785',
    publicationDate: '2026-01-16',
    modificationDate: '2026-04-09',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 1,
    historicalVersions: [],
    normativeExcerpt:
      'CGI Art. 200 quater B : Crédit d’impôt égal à 50 % des dépenses de garde hors du domicile pour les enfants âgés de moins de 6 ans au 1er janvier de l’année d’imposition, retenues dans la limite de 3 500 € par enfant (1 750 € en résidence alternée). Art. 199 quater F : Crédit d’impôt égal à 50 % des dépenses d’emploi d’un salarié à domicile dans la limite de 12 000 € majorée de 1 500 € par enfant à charge (plafond de 15 000 € dans le cas général).',
    plainFrenchSummary:
      'Un crédit d’impôt et une réduction d’impôt diminuent directement le montant de votre impôt, mais avec une différence majeure : le crédit d’impôt vous est intégralement remboursé par virement par la DGFiP si vous n’êtes pas imposable (ou s’il dépasse votre impôt), alors qu’une réduction d’impôt peut seulement ramener votre impôt à 0 € sans jamais donner lieu à un remboursement.',
    fiscaliqEducationalNotes:
      'Déduisez toujours les aides reçues (CMG de la CAF/PAJE, CESU préfinancés par l’employeur, APA) avant d’inscrire vos dépenses en cases 7GA ou 7DB : seules les sommes réellement restées à votre charge donnent droit au crédit de 50 %.',
    whyItApplies:
      'Permet de chiffrer exactement l’avantage fiscal lié aux frais de garde d’enfant, aux services à la personne et aux dons aux associations.',
    eligibilityConditions: [
      'Crédit d’impôt frais de garde hors du domicile (CGI Art. 200 quater B — cases 7GA à 7GG) : 50 % des sommes versées (après déduction des aides CAF CMG et employeur) pour un enfant de moins de 6 ans au 1er janvier de l’année des revenus, dans la limite de 3 500 € de dépenses par enfant (crédit max de 1 750 € par enfant ; plafonds divisés par 2 en garde alternée).',
      'Crédit d’impôt emploi d’un salarié à domicile (CGI Art. 199 quater F — case 7DB) : 50 % des dépenses nettes d’aides (ménage, soutien scolaire, jardinage, garde à domicile), dans la limite d’un plafond de base de 12 000 € majoré de 1 500 € par enfant à charge (plafond max de 15 000 € dans le cas général, soit 7 500 € de crédit max).',
      'Réduction d’impôt pour dons aux associations (CGI Art. 200 — cases 7UD / 7UF) : 75 % des dons aux organismes d’aide aux personnes en difficulté (case 7UD) jusqu’à 1 000 € de dons (soit 750 € de réduction max), puis 66 % au-delà et pour les organismes d’intérêt général (case 7UF) dans la limite de 20 % du revenu imposable.',
    ],
    exclusionsAndLimits: [
      'Seules les sommes réellement restées à votre charge (après déduction du CMG de la CAF/PAJE, de l’APA ou des CESU préfinancés par l’employeur) ouvrent droit au crédit d’impôt.',
      'Plafonnement global des niches fiscales (CGI Art. 200-0 A) : le cumul des crédits et réductions d’impôt concernés ne peut pas dépasser 10 000 € par an et par foyer fiscal (les dons aux associations n’entrent pas dans ce plafond de 10 000 €).',
      'Avance de 60 % en janvier (CGI Art. 1665 bis) : si vous avez bénéficié de crédits/réductions récurrents l’année précédente, la DGFiP vous verse 60 % d’avance à la mi-janvier ; si vos dépenses ont baissé ou cessé, l’avance excédentaire est régularisée en été.',
    ],
    declarationBoxes: ['7GA', '7GB', '7DB', '7DR', '7UD', '7UF'],
    explainedTerms: [
      {
        term: 'Crédit d’impôt',
        plainExplanation:
          'Avantage fiscal qui diminue votre impôt et qui vous est remboursé sur votre compte bancaire si son montant dépasse votre impôt (ou si votre impôt est de 0 €).',
      },
      {
        term: 'Réduction d’impôt',
        plainExplanation:
          'Avantage fiscal qui diminue votre impôt jusqu’à 0 €, mais dont le surplus n’est jamais remboursé si vous payez peu ou pas d’impôt (pour les dons, l’excédent au-delà de 20 % du revenu imposable est reportable 5 ans).',
      },
      {
        term: 'Avance de 60 % de janvier',
        plainExplanation:
          'Acompte versé mi-janvier par les impôts égal à 60 % de vos crédits/réductions récurrents (garde d’enfant, emploi à domicile, dons). Le solde est calculé à l’été après votre déclaration.',
      },
    ],
    simpleExample:
      'Si votre impôt avant avantages est de 800 € et que vous avez droit à un crédit d’impôt garde d’enfant de 1 500 € (pour 3 000 € de frais de crèche nets d’aides CAF), votre impôt tombe à 0 € et le Trésor public vous rembourse la différence de 700 €.',
    copyrightAndAccessNotice:
      'Fiches officielles Service-Public Particuliers (DILA) & impots.gouv.fr — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-CI-01)',
    reviewNotes: 'Plafonds 3 500 €/enfant (Art. 200 quater B) et 12 000 €–15 000 € (Art. 199 quater F) validés.',
    keywords: [
      'crédit d’impôt',
      'réduction d’impôt',
      'différence',
      'garde d’enfant',
      'crèche',
      'assistante maternelle',
      'emploi à domicile',
      'ménage',
      'jardinage',
      'soutien scolaire',
      'cesu',
      'pajemploi',
      'dons',
      'association',
      '7ga',
      '7db',
      '7ud',
      '7uf',
      'avance 60%',
    ],
  },

  // ==========================================================================
  // 10. PRÉLÈVEMENT À LA SOURCE (PAS) & BULLETIN DE PAIE
  // ==========================================================================
  {
    id: 'doc-salaire-net-imposable-pas-2026',
    title: 'Comprendre sa fiche de paie et son Prélèvement à la source (Taux personnalisé, individualisé et non personnalisé)',
    domain: 'SALAIRE_PRELEVEMENT_SOURCE',
    topic: 'PRELEVEMENT_A_LA_SOURCE',
    publisher: 'impots.gouv.fr',
    authority: 'impots.gouv.fr',
    normativeTier: 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference: 'CGI — Art. 83, 204 E, 204 F, 204 H, 204 J et 204 M & CSS — Art. L136-2',
    officialUrl: 'https://www.impots.gouv.fr/particulier/gerer-mon-prelevement-la-source',
    sourceUrl: 'https://www.impots.gouv.fr/particulier/gerer-mon-prelevement-la-source',
    publicationDate: '2025-09-01',
    modificationDate: '2026-01-10',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 2,
    historicalVersions: [
      {
        versionNumber: 1,
        applicableIncomeYear: 2024,
        applicableTaxYear: 2025,
        effectiveDate: '2025-01-01',
        publicationDate: '2024-09-01',
        modificationDate: '2025-01-15',
        archivedDate: '2025-09-01',
        officialReference: 'CGI — Art. 204 M (avant l’entrée en vigueur du taux individualisé par défaut des couples au 1er septembre 2025)',
        normativeExcerpt:
          'Avant le 1er septembre 2025, le taux personnalisé commun du foyer s’appliquait par défaut aux deux membres du couple sauf option expresse pour le taux individualisé.',
        plainFrenchSummary:
          'Régime antérieur au 1er septembre 2025 où le taux foyer était appliqué par défaut aux couples.',
        changeReason: 'Application de l’article 204 M modifié (Loi de finances pour 2024) rendant le taux individualisé automatique par défaut pour les couples mariés/pacsés à compter du 1er septembre 2025 sauf option contraire.',
      },
    ],
    normativeExcerpt:
      'CGI Art. 204 E à 204 M : La retenue à la source est calculée en appliquant au montant net imposable des salaires ou pensions le taux de prélèvement déterminé par l’administration fiscale. À compter du 1er septembre 2025 (Art. 204 M), le taux du foyer des couples soumis à imposition commune est individualisé de plein droit pour leurs revenus personnels, sauf option pour le maintien du taux commun du foyer.',
    plainFrenchSummary:
      'Sur votre bulletin de paie, le Salaire net imposable est toujours un peu plus élevé que votre Salaire net avant impôt. Pourquoi ? Parce que certaines cotisations prélevées sur votre salaire (la CSG non déductible à 2,40 % et la CRDS à 0,50 %) ainsi que la part payée par votre employeur pour votre mutuelle santé obligatoire restent soumises à l’impôt sur le revenu. C’est sur ce Salaire net imposable que votre employeur applique votre taux de prélèvement à la source (PAS), puis il soustrait cet impôt de votre Salaire net avant impôt pour obtenir le Net payé en banque.',
    fiscaliqEducationalNotes:
      'FISCALIQ ne modifie jamais votre taux officiel auprès de votre employeur : toute demande de modulation se fait exclusivement sur votre espace particulier impots.gouv.fr (« Gérer mon prélèvement à la source »).',
    whyItApplies:
      'Explique le calcul exact entre les lignes d’un bulletin de salaire français et le fonctionnement des 3 taux de prélèvement à la source (personnalisé, individualisé, neutre).',
    eligibilityConditions: [
      'Taux personnalisé du foyer (CGI Art. 204 E) : calculé à partir de votre dernière déclaration de revenus.',
      'Taux individualisé pour les couples mariés ou pacsés (CGI Art. 204 M) : répartit le prélèvement entre les conjoints selon leurs revenus respectifs sans changer l’impôt total annuel du foyer (régime par défaut des couples depuis septembre 2025 sauf maintien du taux foyer).',
      'Taux non personnalisé / neutre (CGI Art. 204 H) : grille mensuelle proche d’un célibataire sans enfant, utilisée en début d’emploi ou sur option de confidentialité vis-à-vis de l’employeur.',
      'Modulation à la baisse du taux PAS (CGI Art. 204 J) : autorisée sur impots.gouv.fr si le nouveau prélèvement estimé est inférieur d’au moins 5 % au prélèvement actuel.',
    ],
    exclusionsAndLimits: [
      'Le prélèvement à la source est un acompte mensuel : il ne dispense jamais de déposer la déclaration annuelle de revenus au printemps.',
      'Si vous choisissez le taux neutre et qu’il est inférieur au taux réel de votre foyer, vous devez régler chaque mois le complément directement à la DGFiP.',
    ],
    declarationBoxes: ['1AJ', '1BJ', '8HV', '8IV'],
    explainedTerms: [
      {
        term: 'Salaire net avant impôt',
        plainExplanation:
          'Le salaire qu’il vous reste après déduction de toutes les cotisations sociales salariales (retraite, santé, CSG/CRDS), juste avant la retenue de l’impôt à la source.',
      },
      {
        term: 'Salaire net imposable',
        plainExplanation:
          'Le montant déclaré aux impôts. Il est égal au net avant impôt + la CSG/CRDS non déductible (2,90 % sur 98,25 % du brut) + la part employeur de votre mutuelle santé obligatoire.',
      },
      {
        term: 'Taux individualisé',
        plainExplanation:
          'Pour un couple marié ou pacsé ayant un écart de salaire, il attribue un taux plus bas au conjoint qui gagne le moins et un taux ajusté au conjoint qui gagne le plus.',
      },
    ],
    simpleExample:
      'Sur un salaire brut mensuel de 3 000 € (non-cadre), les cotisations salariales sont d’environ 630 €, soit un Net avant impôt de 2 370 €. En réintégrant la CSG/CRDS non déductible (~85 €) et la part patronale mutuelle (55 €), le Salaire net imposable est de 2 510 €. Si votre taux PAS est de 4,5 %, l’impôt prélevé est de 2 510 € × 4,5 % = 112,95 €, et vous recevez 2 370 € − 112,95 € = 2 257,05 € sur votre compte bancaire.',
    copyrightAndAccessNotice:
      'Documentation officielle DGFiP (impots.gouv.fr) — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-PAS-01)',
    reviewNotes: 'Réforme de l’individualisation par défaut des couples (Art. 204 M CGI) intégrée et vérifiée.',
    keywords: [
      'salaire',
      'fiche de paie',
      'bulletin de paie',
      'brut',
      'net avant impôt',
      'net imposable',
      'prélèvement à la source',
      'pas',
      'taux personnalisé',
      'taux individualisé',
      'taux neutre',
      'csg',
      'crds',
      'mutuelle',
      'modulation',
      '204',
    ],
  },

  // ==========================================================================
  // 11. PROCÉDURES DE DÉCLARATION ANNUELLE (Formulaire 2042, Tacite & Correction)
  // ==========================================================================
  {
    id: 'doc-declaration-annuelle-calendrier-2026',
    title: 'Procédures de déclaration annuelle des revenus (Formulaire 2042), Déclaration automatique et Correction en ligne',
    domain: 'DECLARATION_CALENDRIER',
    topic: 'PROCEDURES_DECLARATION',
    publisher: 'impots.gouv.fr',
    authority: 'impots.gouv.fr',
    normativeTier: 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference: 'CGI — Art. 170, Art. 171 (Déclaration tacite) et Art. 175 (Délais de déclaration)',
    officialUrl: 'https://www.impots.gouv.fr/particulier/questions/quelles-sont-les-dates-limites-pour-declarer-mes-revenus',
    sourceUrl: 'https://www.impots.gouv.fr/particulier/questions/quelles-sont-les-dates-limites-pour-declarer-mes-revenus',
    publicationDate: '2026-04-01',
    modificationDate: '2026-04-10',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 1,
    historicalVersions: [],
    normativeExcerpt:
      'CGI Art. 170 : En vue de l’établissement de l’impôt sur le revenu, toute personne imposable est tenue de souscrire et de faire parvenir à l’administration une déclaration détaillée de ses revenus et bénéfices, de ses charges de famille et des autres éléments nécessaires au calcul de l’impôt. Art. 171 : Les contribuables éligibles à la déclaration tacite sont réputés avoir souscrit leur déclaration si aucune modification n’est apportée avant la date limite.',
    plainFrenchSummary:
      'Chaque printemps (d’avril à début juin selon votre département), tous les foyers doivent vérifier ou compléter leur déclaration des revenus de l’année précédente sur impots.gouv.fr. Même si vos salaires et retraites sont préremplis, vous devez vérifier les montants et ajouter vous-même vos réductions/crédits d’impôt (garde d’enfant, dons, emploi à domicile), vos frais réels, vos revenus locatifs ou un changement de situation familiale. À la fin de l’été (août-septembre), la DGFiP calcule le solde final entre l’impôt dû et ce que vous avez déjà payé à la source.',
    fiscaliqEducationalNotes:
      'Les justificatifs (reçus de dons, factures de frais réels, attestations garde d’enfant) ne sont pas joints à la déclaration en ligne mais doivent être conservés 3 ans en cas de contrôle.',
    whyItApplies:
      'Rappelle les étapes clés du calendrier fiscal des particuliers, le fonctionnement de la déclaration automatique et le service « Corriger ma déclaration ».',
    eligibilityConditions: [
      'Janvier : versement de l’avance de 60 % des crédits et réductions d’impôt récurrents.',
      'Avril à début juin : ouverture de la déclaration en ligne (Zone 1 : départements 01 à 19 et non-résidents fin mai ; Zone 2 : départements 20 à 54 fin mai/début juin ; Zone 3 : départements 55 à 976 début juin).',
      'Juillet à août : mise à disposition de l’avis d’impôt et remboursement par virement des trop-perçus ou des soldes de crédits d’impôt.',
      'Septembre à décembre : prélèvement du reste à payer (en 1 seule fois en septembre si ≤ 300 €, ou étalé en 4 mensualités égales de septembre à décembre si > 300 €) et mise à jour automatique du taux de prélèvement à la source.',
    ],
    exclusionsAndLimits: [
      'La déclaration automatique (sans action de votre part) n’est valable que si vous y êtes éligible ET qu’aucune information préremplie n’a changé (ni adresse, ni situation de famille, ni nouveau revenu ou crédit d’impôt).',
      'En cas d’oubli ou d’erreur après la date limite, le service « Corriger ma déclaration en ligne » est ouvert sur impots.gouv.fr d’août à début décembre sans pénalité de retard.',
    ],
    declarationBoxes: ['Formulaire 2042', 'Formulaire 2042 RICI', 'Formulaire 2044'],
    explainedTerms: [
      {
        term: 'Revenu Fiscal de Référence (RFR)',
        plainExplanation:
          'Indicateur figurant en première page de votre avis d’impôt qui sert à déterminer votre éligibilité à de nombreuses aides sociales, bourses, tarifs de crèche ou exonérations locales.',
      },
      {
        term: 'Régularisation d’été (Solde d’impôt)',
        plainExplanation:
          'Comparaison effectuée par la DGFiP en juillet-août entre votre impôt définitif de l’année et les prélèvements à la source déjà retenus : elle aboutit soit à un remboursement, soit à un solde à payer à l’automne.',
      },
    ],
    simpleExample:
      'Si votre impôt définitif calculé en été est de 1 800 € et que vous avez déjà été prélevé de 1 200 € à la source l’année précédente, il vous reste un solde de 600 € à régler. Comme 600 € dépasse 300 €, la DGFiP prélève automatiquement 4 échéances de 150 € en septembre, octobre, novembre et décembre.',
    copyrightAndAccessNotice:
      'Documentation officielle DGFiP (impots.gouv.fr) — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-DEC-01)',
    reviewNotes: 'Procédures 2042, déclaration automatique et service de correction en ligne vérifiés.',
    keywords: [
      'déclaration',
      '2042',
      'calendrier',
      'date limite',
      'avis d’impôt',
      'corriger',
      'erreur',
      'oubli',
      'remboursement',
      'reste à payer',
      'septembre',
      '4 fois',
      '300 euros',
      'rfr',
      'revenu fiscal de référence',
      'prérempli',
    ],
  },

  // ==========================================================================
  // 12. OBLIGATIONS DE PAIEMENT, RECOUVREMENT, ÉTALEMENT SEPT-DÉC & MAJORATIONS
  // ==========================================================================
  {
    id: 'doc-obligations-paiement-recouvrement-2026',
    title: 'Obligations de paiement, recouvrement du solde d’impôt (seuil de 300 €), seuil de 61 € et pénalités de retard',
    domain: 'DECLARATION_CALENDRIER',
    topic: 'OBLIGATIONS_PAIEMENT_RECOUVREMENT',
    publisher: 'Legifrance',
    authority: 'Legifrance',
    normativeTier: 'LEGISLATION_CGI_LOI',
    verificationStatus: 'APPROVED_VERIFIED',
    officialReference:
      'CGI — Art. 1657-1 bis (Seuil de non-recouvrement 61 €), Art. 1663 B (Prélèvement du solde en 1 ou 4 échéances), Art. 1727 et 1728 (Intérêts et majorations de retard)',
    officialUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037988152',
    sourceUrl: 'https://www.economie.gouv.fr/particuliers/impot-sur-le-revenu-comment-payer-solde',
    publicationDate: '2025-12-30',
    modificationDate: '2026-01-15',
    retrievalDate: '2026-11-08',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-08',
    versionNumber: 1,
    historicalVersions: [],
    normativeExcerpt:
      'CGI Art. 1657-1 bis : Les cotisations d’impôt sur le revenu ne sont pas mises en recouvrement lorsque leur montant, avant imputation de tout crédit d’impôt, est inférieur à 61 €. Art. 1663 B : Le solde d’impôt sur le revenu est prélevé en une seule fois en septembre lorsqu’il est inférieur ou égal à 300 €, et en quatre fractions égales de septembre à décembre lorsqu’il excède 300 €.',
    plainFrenchSummary:
      'Lorsque votre avis d’impôt est établi à l’été, deux cas se présentent : soit vous avez trop payé à la source (ou vos crédits d’impôt dépassent votre impôt) et la DGFiP vous rembourse automatiquement par virement bancaire fin juillet ou début août ; soit il vous reste un solde à payer. Ce solde est prélevé automatiquement sur votre compte bancaire en une seule fois fin septembre s’il est inférieur ou égal à 300 €, ou en 4 mensualités égales de septembre à décembre s’il dépasse 300 €.',
    fiscaliqEducationalNotes:
      'En cas de difficultés financières passagères, vous pouvez demander un délai de paiement ou une remise gracieuse via votre messagerie sécurisée sur impots.gouv.fr.',
    whyItApplies:
      'Détaille les règles légales exactes de recouvrement du solde d’impôt, le seuil d’exonération de recouvrement de 61 € et les majorations en cas de déclaration tardive.',
    eligibilityConditions: [
      'Seuil de non-recouvrement de 61 € (CGI Art. 1657-1 bis) : si votre impôt après réductions (mais avant crédits d’impôt) est strictement inférieur à 61 €, il est ramené à 0 €.',
      'Solde à payer ≤ 300 € (CGI Art. 1663 B) : prélèvement unique sur le compte bancaire vers le 25 septembre.',
      'Solde à payer > 300 € (CGI Art. 1663 B) : prélèvement automatique en 4 échéances égales (fin septembre, fin octobre, fin novembre, fin décembre) sans frais.',
    ],
    exclusionsAndLimits: [
      'Déclaration déposée hors délai sans mise en demeure (CGI Art. 1728) : majoration de 10 % de l’impôt dû, plus 0,20 % d’intérêt de retard par mois (CGI Art. 1727).',
      'Droit à l’erreur (Loi ESSOC) : si vous corrigez spontanément une erreur de bonne foi, l’intérêt de retard est réduit de 30 % à 50 %.',
    ],
    declarationBoxes: ['Avis d’impôt 2042', 'Coordonnées bancaires RIB'],
    explainedTerms: [
      {
        term: 'Seuil de non-recouvrement (61 €)',
        plainExplanation:
          'Règle légale selon laquelle le Trésor public ne réclame pas l’impôt sur le revenu lorsque son montant est inférieur à 61 €.',
      },
      {
        term: 'Étalement automatique (> 300 €)',
        plainExplanation:
          'Division automatique en 4 prélèvements mensuels (septembre à décembre) de tout reste à payer supérieur à 300 €.',
      },
    ],
    simpleExample:
      'Si votre impôt calculé après décote est de 48 €, il est inférieur au seuil de 61 € : votre impôt mis en recouvrement est donc de 0 €.',
    copyrightAndAccessNotice:
      'Textes consolidés Légifrance & fiches economie.gouv.fr — Licence Ouverte Etalab 2.0.',
    ingestionMethod: 'LEGIFRANCE_BOFIP_OPEN_DATA_EXTRACT',
    reviewedBy: 'Comité Juridique & Fiscal FISCALIQ (Validation n° 2026-REC-01)',
    reviewNotes: 'Articles 1657-1 bis, 1663 B, 1727 et 1728 du CGI vérifiés.',
    keywords: [
      'paiement',
      'recouvrement',
      'solde',
      'reste à payer',
      '300 €',
      '61 €',
      '4 fois',
      'mensualités',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
      'retard',
      'pénalité',
      'majoration',
      '10%',
      'droit à l’erreur',
      '1657',
      '1663',
    ],
  },

  // ==========================================================================
  // 13. FICHE EN ATTENTE DE REVUE (PENDING_REVIEW) — Démonstration du garde-fou :
  //     EXCLUE automatiquement des réponses faisant foi tant qu'elle n'est pas approuvée
  // ==========================================================================
  {
    id: 'doc-candidate-bareme-kilometrique-2026-pending',
    title: 'Note d’actualisation du barème kilométrique 2026 (voitures, deux-roues et majoration véhicules électriques +20 %)',
    domain: 'FRAIS_PROFESSIONNELS',
    topic: 'SALAIRES_TRAITEMENTS',
    publisher: 'economie.gouv.fr',
    authority: 'economie.gouv.fr',
    normativeTier: 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
    verificationStatus: 'PENDING_REVIEW',
    officialReference: 'CGI Annexe IV — Art. 6 B & Arrêté ministériel barème kilométrique (vérification de concordance BOFiP en cours)',
    officialUrl: 'https://www.economie.gouv.fr/particuliers/bareme-kilometrique',
    sourceUrl: 'https://www.economie.gouv.fr/particuliers/bareme-kilometrique',
    publicationDate: '2026-03-25',
    modificationDate: '2026-04-02',
    retrievalDate: '2026-11-09',
    applicableIncomeYear: 2025,
    applicableTaxYear: 2026,
    effectiveDate: '2026-01-01',
    effectiveFromDate: '2026-01-01',
    verifiedDate: '2026-11-09',
    versionNumber: 1,
    historicalVersions: [],
    normativeExcerpt:
      'CGI Annexe IV Art. 6 B : Le barème forfaitaire permettant l’évaluation des frais de déplacement de 3 CV à 7 CV et plus inclut une majoration de 20 % pour les véhicules 100 % électriques.',
    plainFrenchSummary:
      'Fiche candidate importée depuis economie.gouv.fr concernant les coefficients du barème kilométrique et la majoration de 20 % applicable aux véhicules 100 % électriques pour la déduction des frais réels.',
    fiscaliqEducationalNotes:
      'STATUT EN ATTENTE DE REVUE : Cette fiche est visible dans l’interface d’administration des sources pour validation par un réviseur, mais elle est strictement exclue des réponses de l’assistant fiscal tant que son statut n’est pas passé à APPROVED_VERIFIED.',
    whyItApplies:
      'Permet aux salariés optant pour les frais réels (cases 1AK/1BK) d’évaluer leurs frais de véhicule personnel.',
    eligibilityConditions: [
      'Être propriétaire, copropriétaire ou locataire du véhicule utilisé pour les trajets domicile-travail.',
      'Conserver les justificatifs de kilométrage et la carte grise du véhicule.',
    ],
    exclusionsAndLimits: [
      'Le barème couvre l’amortissement, l’entretien, les pneumatiques, le carburant et l’assurance : ces frais ne peuvent pas être déduits une seconde fois en plus du barème.',
    ],
    declarationBoxes: ['1AK', '1BK'],
    explainedTerms: [
      {
        term: 'Puissance fiscale (CV)',
        plainExplanation:
          'Nombre de chevaux fiscaux inscrit à la rubrique P.6 de votre certificat d’immatriculation (carte grise), plafonné à 7 CV pour le barème kilométrique.',
      },
    ],
    simpleExample:
      'Pour un véhicule électrique de 4 CV parcourant 10 000 km professionnels sur l’année, le montant issu du barème standard est majoré de +20 %.',
    copyrightAndAccessNotice:
      'Fiche publique economie.gouv.fr — Licence Ouverte Etalab 2.0 (en attente de validation interne FISCALIQ).',
    ingestionMethod: 'PUBLIC_OFFICIAL_PAGE_MANUAL_CURATION',
    reviewedBy: 'En attente de revue (File d’attente Gouvernance)',
    reviewNotes: 'En attente de double contrôle du tableau des coefficients par puissance fiscale avant publication.',
    keywords: ['barème kilométrique', 'chevaux fiscaux', 'véhicule électrique', '20%', 'indemnités kilométriques'],
  },
];

/**
 * État mutable en mémoire du registre des sources (permettant les actions d'administration :
 * Approuver, Rejeter, Archiver, Mettre à jour avec conservation de l'historique, et Ingérer)
 */
let runtimeKnowledgeRegistry: OfficialPersonalTaxDocument[] = structuredClone(
  INITIAL_PERSONAL_TAX_KNOWLEDGE_BASE
);

export function getKnowledgeRegistrySources(options?: {
  includeNonApproved?: boolean;
  topic?: PersonalTaxKnowledgeTopic | 'ALL';
  publisher?: OfficialPublisher | 'ALL';
  normativeTier?: NormativeTier | 'ALL';
  verificationStatus?: SourceVerificationStatus | 'ALL';
  applicableIncomeYear?: 2025 | 2024 | 'ALL';
}): OfficialPersonalTaxDocument[] {
  const {
    includeNonApproved = true,
    topic = 'ALL',
    publisher = 'ALL',
    normativeTier = 'ALL',
    verificationStatus = 'ALL',
    applicableIncomeYear = 'ALL',
  } = options || {};

  return runtimeKnowledgeRegistry.filter((doc) => {
    if (!includeNonApproved && doc.verificationStatus !== 'APPROVED_VERIFIED') {
      return false;
    }
    if (topic !== 'ALL' && doc.topic !== topic) {
      return false;
    }
    if (publisher !== 'ALL' && doc.publisher !== publisher) {
      return false;
    }
    if (normativeTier !== 'ALL' && doc.normativeTier !== normativeTier) {
      return false;
    }
    if (verificationStatus !== 'ALL' && doc.verificationStatus !== verificationStatus) {
      return false;
    }
    if (applicableIncomeYear !== 'ALL' && doc.applicableIncomeYear !== applicableIncomeYear) {
      return false;
    }
    return true;
  });
}

/**
 * Export de référence (uniquement les sources APPROVED_VERIFIED pour garantir qu'aucun appel
 * direct ne consomme une source non vérifiée)
 */
export const PERSONAL_TAX_KNOWLEDGE_BASE: OfficialPersonalTaxDocument[] =
  INITIAL_PERSONAL_TAX_KNOWLEDGE_BASE.filter(
    (doc) => doc.verificationStatus === 'APPROVED_VERIFIED'
  );

/**
 * Compatibilité descendante : export du corpus au format OfficialLegalReference
 */
export const OFFICIAL_FRENCH_TAX_CORPUS: OfficialLegalReference[] =
  PERSONAL_TAX_KNOWLEDGE_BASE.map((doc) => ({
    id: doc.id,
    title: doc.title,
    category: doc.domain,
    authority: doc.authority,
    officialReference: doc.officialReference,
    sourceUrl: doc.sourceUrl,
    applicableTaxYear: doc.applicableTaxYear,
    verifiedDate: doc.verifiedDate,
    summary: doc.plainFrenchSummary,
    eligibilityConditions: doc.eligibilityConditions,
    keywords: doc.keywords,
  }));

// ============================================================================
// PIPELINE D'EXTRACTION DE TEXTE, DE DÉCOUPAGE (CHUNKING) ET D'EMBEDDINGS
// ============================================================================

/**
 * Normalise et extrait le texte brut structuré d'un document juridique ou administratif
 * en nettoyant le balisage parasite et en préservant les références d'articles du CGI/BOFiP.
 */
export function extractAndNormalizeLegalText(rawText: string): {
  cleanedText: string;
  characterCount: number;
  estimatedTokens: number;
  detectedCitations: string[];
} {
  const cleanedText = rawText
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const citationRegex =
    /\b(?:CGI|LPF|CSS|BOI-[A-Z0-9-]+|Art(?:icle)?\.?\s*\d+(?:\s*(?:bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies|quatervicies|[A-Z]))?)\b/gi;
  const matches = cleanedText.match(citationRegex) || [];
  const detectedCitations = Array.from(new Set(matches.map((m) => m.trim())));

  return {
    cleanedText,
    characterCount: cleanedText.length,
    estimatedTokens: Math.max(1, Math.ceil(cleanedText.length / 4)),
    detectedCitations,
  };
}

/**
 * Génère un vecteur d'embedding déterministe normalisé (norme L2 = 1)
 * basé sur une projection sémantique et lexicale française.
 * Utilisé en mode synchrone local et comme repli déterministe lorsque l'API Gemini
 * (`gemini-embedding-2`) n'est pas appelée en direct.
 */
export function computeDeterministicEmbedding(
  text: string,
  dimensions = 32
): number[] {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const vector = new Array<number>(dimensions).fill(0);

  // Graines sémantiques thématiques sur les 12 piliers fiscaux français
  const semanticAnchors: string[][] = [
    ['bareme', 'tranche', 'tmi', 'decote', '197', 'progressif', 'taux moyen'],
    ['foyer', 'mariage', 'pacs', 'concubinage', 'divorce', 'rattachement', 'article 6'],
    ['quotient', 'part', 'demi-part', 'enfant', 'garde alternee', 'parent isole', 'case t', '1807'],
    ['salaire', 'traitement', 'frais reels', 'abattement 10', 'kilometrique', '1ak', '1bk', '14555'],
    ['pension', 'retraite', '1as', '1bs', '4439', 'invalidite', '158'],
    ['foncier', 'loyer', 'locatif', 'micro-foncier', 'deficit foncier', '2044', '4be', '15000', '10700'],
    ['deduction', 'per', 'epargne retraite', 'pension alimentaire', '6ns', '6el', '163', '156'],
    ['reduction', 'don', 'association', '75%', '66%', '7ud', '7uf', '200'],
    ['credit', 'garde', 'creche', 'emploi a domicile', 'menage', 'cesu', '7ga', '7db', '50%'],
    ['prelevement a la source', 'pas', 'taux personnalise', 'taux individualise', 'taux neutre', 'csg', '204'],
    ['declaration', '2042', 'calendrier', 'avis', 'corriger', 'rfr', 'tacite', '170'],
    ['paiement', 'recouvrement', 'solde', '300', '61', 'mensualite', 'septembre', 'penalite', '1663'],
  ];

  for (let i = 0; i < semanticAnchors.length && i < dimensions; i++) {
    for (const term of semanticAnchors[i]) {
      if (normalized.includes(term)) {
        vector[i] += 2.5;
      }
    }
  }

  // Projection par n-grammes de mots pour couvrir tout le vocabulaire
  const tokens = normalized.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  for (const token of tokens) {
    let hash = 2166136261;
    for (let c = 0; c < token.length; c++) {
      hash ^= token.charCodeAt(c);
      hash = Math.imul(hash, 16777619);
    }
    const bucket = Math.abs(hash) % dimensions;
    vector[bucket] += 1.0;
  }

  // Normalisation L2
  const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0));
  if (norm === 0) {
    return vector;
  }
  return vector.map((v) => Number((v / norm).toFixed(4)));
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const len = Math.min(vecA.length, vecB.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return Number((dot / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(4));
}

/**
 * Découpe un document officiel en segments sémantiques (chunks) distincts selon leur niveau normatif :
 * - Segment 1 : Extrait légal / doctrinaire officiel (CGI / BOFiP)
 * - Segment 2 : Conditions d'éligibilité, plafonds et exclusions officielles
 * - Segment 3 : Explication pédagogique en français courant & exemple chiffré FISCALIQ
 */
export function chunkKnowledgeDocument(
  doc: OfficialPersonalTaxDocument
): KnowledgeDocumentChunk[] {
  const sections: Array<{
    heading: string;
    tier: NormativeTier;
    body: string;
  }> = [
    {
      heading: `${doc.title} — Texte de référence (${doc.officialReference})`,
      tier: doc.normativeTier,
      body: `${doc.officialReference}. ${doc.normativeExcerpt} Pourquoi cette règle s'applique : ${doc.whyItApplies}`,
    },
    {
      heading: `${doc.title} — Conditions d'éligibilité, plafonds et exclusions (Cases ${doc.declarationBoxes.join(', ')})`,
      tier:
        doc.normativeTier === 'LEGISLATION_CGI_LOI'
          ? 'LEGISLATION_CGI_LOI'
          : 'EXPLICATION_OFFICIELLE_ADMINISTRATION',
      body: `Conditions requises : ${doc.eligibilityConditions.join(' ')} Limites et exclusions : ${doc.exclusionsAndLimits.join(' ')} Cases de déclaration 2042 : ${doc.declarationBoxes.join(', ')}.`,
    },
    {
      heading: `${doc.title} — Synthèse en français simple et exemple concret (Contenu pédagogique FISCALIQ)`,
      tier: 'CONTENU_PEDAGOGIQUE_FISCALIQ',
      body: `${doc.plainFrenchSummary} Exemple concret : ${doc.simpleExample} Note pédagogique : ${doc.fiscaliqEducationalNotes}`,
    },
  ];

  return sections.map((sec, idx) => {
    const normalized = extractAndNormalizeLegalText(sec.body);
    return {
      chunkId: `${doc.id}-v${doc.versionNumber}-chunk-${idx + 1}`,
      sourceId: doc.id,
      sourceTitle: doc.title,
      publisher: doc.publisher,
      officialUrl: doc.officialUrl,
      officialReference: doc.officialReference,
      versionNumber: doc.versionNumber,
      chunkIndex: idx + 1,
      sectionHeading: sec.heading,
      sectionTier: sec.tier,
      chunkText: normalized.cleanedText,
      tokenEstimate: normalized.estimatedTokens,
      applicableIncomeYear: doc.applicableIncomeYear,
      applicableTaxYear: doc.applicableTaxYear,
      effectiveDate: doc.effectiveDate,
      topic: doc.topic,
      verificationStatus: doc.verificationStatus,
      embeddingPreview: computeDeterministicEmbedding(
        `${sec.heading} ${normalized.cleanedText} ${doc.keywords.join(' ')}`,
        32
      ),
    };
  });
}

export interface SemanticSearchFilterOptions {
  applicableIncomeYear?: 2025 | 2024 | 'ALL';
  effectiveDate?: string;
  topic?: PersonalTaxKnowledgeTopic | 'ALL';
  publisher?: OfficialPublisher | 'ALL';
  normativeTier?: NormativeTier | 'ALL';
  onlyApprovedVerified?: boolean;
  maxResults?: number;
}

/**
 * Recherche sémantique hybride (vecteur cosinus + correspondance lexicale + filtrage strict de métadonnées).
 * Par défaut (`onlyApprovedVerified = true`), SEULES les sources `APPROVED_VERIFIED` peuvent être retournées.
 */
export function searchVerifiedKnowledgeChunks(
  query: string,
  options: SemanticSearchFilterOptions = {}
): KnowledgeChunkSearchResult[] {
  const {
    applicableIncomeYear = 'ALL',
    effectiveDate = '2026-12-31',
    topic = 'ALL',
    publisher = 'ALL',
    normativeTier = 'ALL',
    onlyApprovedVerified = true,
    maxResults = 6,
  } = options;

  const queryVec = computeDeterministicEmbedding(query, 32);
  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const eligibleSources = runtimeKnowledgeRegistry.filter((doc) => {
    if (onlyApprovedVerified && doc.verificationStatus !== 'APPROVED_VERIFIED') {
      return false;
    }
    if (applicableIncomeYear !== 'ALL' && doc.applicableIncomeYear !== applicableIncomeYear) {
      return false;
    }
    if (effectiveDate && doc.effectiveDate > effectiveDate) {
      return false;
    }
    if (topic !== 'ALL' && doc.topic !== topic) {
      return false;
    }
    if (publisher !== 'ALL' && doc.publisher !== publisher) {
      return false;
    }
    return true;
  });

  const results: KnowledgeChunkSearchResult[] = [];

  for (const source of eligibleSources) {
    const chunks = chunkKnowledgeDocument(source);
    for (const chunk of chunks) {
      if (normativeTier !== 'ALL' && chunk.sectionTier !== normativeTier && source.normativeTier !== normativeTier) {
        continue;
      }

      const semanticSimilarity = cosineSimilarity(queryVec, chunk.embeddingPreview);

      let keywordMatches = 0;
      for (const kw of source.keywords) {
        const normKw = kw
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        if (normalizedQuery.includes(normKw)) {
          keywordMatches += 1;
        }
      }
      for (const box of source.declarationBoxes) {
        if (normalizedQuery.includes(box.toLowerCase())) {
          keywordMatches += 2;
        }
      }

      const keywordScore = Math.min(1, keywordMatches * 0.25);
      const combinedScore = Number(
        (semanticSimilarity * 0.65 + keywordScore * 0.35).toFixed(4)
      );

      results.push({
        chunk,
        source,
        semanticSimilarity,
        keywordScore,
        combinedScore,
      });
    }
  }

  results.sort((a, b) => b.combinedScore - a.combinedScore);
  return results.slice(0, maxResults);
}

// ============================================================================
// ADMINISTRATION & GOUVERNANCE DES SOURCES (APPROVE, REJECT, ARCHIVE, UPDATE)
// ============================================================================

export function approveKnowledgeSource(
  sourceId: string,
  reviewerName = 'Administrateur Fiscal FISCALIQ',
  reviewNotes = 'Source officielle vérifiée et approuvée pour les réponses fiscales faisant foi.'
): OfficialPersonalTaxDocument | null {
  const index = runtimeKnowledgeRegistry.findIndex((d) => d.id === sourceId);
  if (index === -1) return null;

  const updated: OfficialPersonalTaxDocument = {
    ...runtimeKnowledgeRegistry[index],
    verificationStatus: 'APPROVED_VERIFIED',
    verifiedDate: new Date().toISOString().slice(0, 10),
    reviewedBy: reviewerName,
    reviewNotes,
  };
  runtimeKnowledgeRegistry[index] = updated;
  return updated;
}

export function rejectKnowledgeSource(
  sourceId: string,
  reviewerName = 'Administrateur Fiscal FISCALIQ',
  reviewNotes = 'Source rejetée : référence légale incomplète ou non opposable.'
): OfficialPersonalTaxDocument | null {
  const index = runtimeKnowledgeRegistry.findIndex((d) => d.id === sourceId);
  if (index === -1) return null;

  const updated: OfficialPersonalTaxDocument = {
    ...runtimeKnowledgeRegistry[index],
    verificationStatus: 'REJECTED',
    reviewedBy: reviewerName,
    reviewNotes,
  };
  runtimeKnowledgeRegistry[index] = updated;
  return updated;
}

export function archiveKnowledgeSource(
  sourceId: string,
  reviewerName = 'Administrateur Fiscal FISCALIQ',
  reviewNotes = 'Source archivée à titre historique (ne sert plus aux réponses courantes par défaut).'
): OfficialPersonalTaxDocument | null {
  const index = runtimeKnowledgeRegistry.findIndex((d) => d.id === sourceId);
  if (index === -1) return null;

  const updated: OfficialPersonalTaxDocument = {
    ...runtimeKnowledgeRegistry[index],
    verificationStatus: 'ARCHIVED_HISTORICAL',
    reviewedBy: reviewerName,
    reviewNotes,
  };
  runtimeKnowledgeRegistry[index] = updated;
  return updated;
}

export interface SourceVersionUpdatePayload {
  sourceId: string;
  newOfficialReference?: string;
  newPlainFrenchSummary: string;
  newNormativeExcerpt?: string;
  newModificationDate?: string;
  newApplicableIncomeYear?: 2025 | 2024;
  newApplicableTaxYear?: 2026 | 2025;
  newEffectiveDate?: string;
  changeReason: string;
  reviewerName?: string;
}

/**
 * Met à jour une source en créant une nouvelle version (`versionNumber + 1`)
 * et en archivant intégralement la version précédente dans `historicalVersions`.
 * Ne remplace ni n'écrase jamais silencieusement une règle antérieure.
 */
export function updateKnowledgeSourcePreserveHistory(
  payload: SourceVersionUpdatePayload
): OfficialPersonalTaxDocument | null {
  const index = runtimeKnowledgeRegistry.findIndex((d) => d.id === payload.sourceId);
  if (index === -1) return null;

  const current = runtimeKnowledgeRegistry[index];
  const today = new Date().toISOString().slice(0, 10);

  const archivedSnapshot: HistoricalSourceVersion = {
    versionNumber: current.versionNumber,
    applicableIncomeYear: current.applicableIncomeYear,
    applicableTaxYear: current.applicableTaxYear,
    effectiveDate: current.effectiveDate,
    publicationDate: current.publicationDate,
    modificationDate: current.modificationDate,
    archivedDate: today,
    officialReference: current.officialReference,
    normativeExcerpt: current.normativeExcerpt,
    plainFrenchSummary: current.plainFrenchSummary,
    changeReason: payload.changeReason,
  };

  const updated: OfficialPersonalTaxDocument = {
    ...current,
    versionNumber: current.versionNumber + 1,
    officialReference: payload.newOfficialReference || current.officialReference,
    plainFrenchSummary: payload.newPlainFrenchSummary,
    normativeExcerpt: payload.newNormativeExcerpt || current.normativeExcerpt,
    modificationDate: payload.newModificationDate || today,
    retrievalDate: today,
    verifiedDate: today,
    applicableIncomeYear:
      payload.newApplicableIncomeYear ?? current.applicableIncomeYear,
    applicableTaxYear: payload.newApplicableTaxYear ?? current.applicableTaxYear,
    effectiveDate: payload.newEffectiveDate || current.effectiveDate,
    effectiveFromDate: payload.newEffectiveDate || current.effectiveFromDate,
    reviewedBy: payload.reviewerName || 'Comité Juridique & Fiscal FISCALIQ',
    reviewNotes: `Mise à jour v${current.versionNumber + 1} (${payload.changeReason}) — Version v${current.versionNumber} préservée dans l'historique immuable.`,
    historicalVersions: [archivedSnapshot, ...current.historicalVersions],
  };

  runtimeKnowledgeRegistry[index] = updated;
  return updated;
}

export function resetKnowledgeRegistryToInitial(): void {
  runtimeKnowledgeRegistry = structuredClone(INITIAL_PERSONAL_TAX_KNOWLEDGE_BASE);
}

export interface PersonalRetrievalOptions {
  taxYear?: 2026 | 2025;
  effectiveDate?: string;
  domainFilter?: PersonalTaxDomain;
  topicFilter?: PersonalTaxKnowledgeTopic;
  maxResults?: number;
}

/**
 * Recherche déterministe (RAG) dans le corpus fiscal personnel vérifié,
 * avec filtrage strict :
 * 1. UNIQUEMENT les sources `verificationStatus === 'APPROVED_VERIFIED'`
 * 2. Filtrage par millésime fiscal (`taxYear`) et date d'effet légale (`effectiveDate`).
 */
export function retrievePersonalTaxReferences(
  query: string,
  options: PersonalRetrievalOptions = {}
): OfficialPersonalTaxDocument[] {
  const {
    taxYear = 2026,
    effectiveDate = '2026-11-10',
    domainFilter,
    topicFilter,
    maxResults = 3,
  } = options;

  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // GARDE-FOU D'AUTORITÉ : seules les sources APPROVED_VERIFIED peuvent être utilisées
  const verifiedPool = runtimeKnowledgeRegistry.filter(
    (doc) => doc.verificationStatus === 'APPROVED_VERIFIED'
  );

  // Filtrage par date d'entrée en vigueur et domaine/thématique éventuels
  const eligibleDocs = verifiedPool.filter((doc) => {
    if (domainFilter && doc.domain !== domainFilter) {
      return false;
    }
    if (topicFilter && doc.topic !== topicFilter) {
      return false;
    }
    if (effectiveDate && doc.effectiveFromDate > effectiveDate) {
      return false;
    }
    // Si l'utilisateur demande explicitement 2025 ou 2024 dans la question, inclure les fiches 2025
    const mentions2025 =
      normalizedQuery.includes('2025') || normalizedQuery.includes('2024');
    if (taxYear === 2025 || mentions2025) {
      return true;
    }
    return doc.applicableTaxYear === taxYear;
  });

  const pool = eligibleDocs.length > 0 ? eligibleDocs : verifiedPool;

  const scored = pool.map((doc) => {
    let score = 0;

    // Bonus de correspondance exacte de millésime
    if (doc.applicableTaxYear === taxYear) {
      score += 2;
    }

    for (const kw of doc.keywords) {
      const normalizedKw = kw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (normalizedQuery.includes(normalizedKw)) {
        score += 4;
      }
    }

    const titleWords = doc.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/);
    for (const word of titleWords) {
      if (word.length > 3 && normalizedQuery.includes(word)) {
        score += 1.5;
      }
    }

    for (const box of doc.declarationBoxes) {
      const normalizedBox = box.toLowerCase();
      if (normalizedQuery.includes(normalizedBox)) {
        score += 5;
      }
    }

    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((item) => item.score > 2).map((item) => item.doc);

  if (matched.length === 0) {
    return pool.slice(0, maxResults);
  }

  return matched.slice(0, maxResults);
}

/**
 * Fonction de compatibilité descendante retournant OfficialLegalReference[]
 */
export function retrieveRelevantReferences(
  query: string,
  maxResults = 3
): OfficialLegalReference[] {
  const docs = retrievePersonalTaxReferences(query, { maxResults });
  return docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    category: doc.domain,
    authority: doc.authority,
    officialReference: doc.officialReference,
    sourceUrl: doc.sourceUrl,
    applicableTaxYear: doc.applicableTaxYear,
    verifiedDate: doc.verifiedDate,
    summary: doc.plainFrenchSummary,
    eligibilityConditions: doc.eligibilityConditions,
    keywords: doc.keywords,
  }));
}
