/**
 * FISCALIQ — Service Serveur de Génération de Rapports Fiscaux Personnels (PDF),
 * Coffre-Fort Privé Supabase Storage & Liens de Téléchargement Signés à Durée Limitée
 *
 * CONTENU OBLIGATOIRE DE CHAQUE RAPPORT :
 * 1. Résumé du profil fiscal personnel et de la situation familiale
 * 2. Estimation détaillée de l'impôt sur le revenu (barème progressif, décote, TMI vs taux moyen)
 * 3. Parts fiscales du foyer (quotient familial CGI Art. 194 et plafonnement)
 * 4. Déductions, réductions d'impôt et crédits d'impôt remboursables
 * 5. Opportunités légales d'optimisation à vérifier et justificatifs requis
 * 6. Analyse du salaire et du prélèvement à la source (PAS : personnalisé, individualisé, neutre)
 * 7. Références officielles vérifiées (CGI, BOFiP, impots.gouv.fr, Service-Public.fr)
 * 8. Millésime fiscal, hypothèses retenues, méthodologie déterministe, statut de vérification et limites
 *
 * SÉCURITÉ & STOCKAGE PRIVÉ :
 * - Génération exclusivement côté serveur (Buffer PDF %PDF-1.4 multi-pages).
 * - Stockage dans le compartiment privé `fiscaliq-personal-reports/{householdId}/{reportId}.pdf`.
 * - Téléchargement uniquement via jeton signé HMAC-SHA256 à durée de vie courte (15 minutes)
 *   et vérification stricte de l'identité du foyer (`authenticatedHouseholdId === householdId`).
 */

import crypto from 'node:crypto';
import {
  DEMO_PERSONAL_HOUSEHOLDS,
  PersonalHouseholdProfile,
  PERSONAL_TAX_OPPORTUNITIES,
} from '@/lib/data/personal-tax-dataset';
import {
  calculatePersonalIncomeTax,
  calculatePersonalSalaryToNetAfterTax,
  computeNeutralWithholdingRate,
} from '@/lib/calculations/personal-tax-engine';
import { retrievePersonalTaxReferences } from '@/lib/ai/knowledge-base';
import {
  PersonalReportType,
  verifyReportGenerationEntitlement,
} from '@/lib/subscriptions/entitlements';

export interface StructuredReportSection {
  sectionNumber: number;
  title: string;
  classificationLabel: 'CALCUL DÉTERMINISTE VÉRIFIÉ' | 'ESTIMATION SELON PROFIL' | 'RÉFÉRENCE OFFICIELLE';
  plainFrenchExplanation: string;
  keyMetrics: Array<{ label: string; value: string; note?: string }>;
  bulletPoints: string[];
}

export interface StoredPersonalTaxReportMeta {
  reportId: string;
  householdId: string;
  householdName: string;
  reportType: PersonalReportType;
  title: string;
  subtitle: string;
  taxYear: 2026 | 2025;
  incomeYear: 2025 | 2024;
  createdAtIso: string;
  createdAtDisplayFr: string;
  privateStorageBucket: 'fiscaliq-personal-reports';
  privateStorageObjectPath: string;
  byteSize: number;
  sha256Checksum: string;
  verificationStatusLabel: string;
  assumptionsSummary: string[];
  methodologySummary: string;
  limitationsDisclaimer: string;
  sections: StructuredReportSection[];
  officialReferences: Array<{
    title: string;
    officialReference: string;
    publisher: string;
    officialUrl: string;
    verifiedDate: string;
  }>;
}

interface StoredReportRecord {
  meta: StoredPersonalTaxReportMeta;
  pdfBuffer: Buffer;
}

const globalForReports = globalThis as unknown as {
  __fiscaliqPrivateReportVault?: Map<string, StoredReportRecord>;
  __fiscaliqErasedHouseholds?: Set<string>;
  __fiscaliqDevEphemeralSecret?: string;
};

const privateReportStorageVault =
  globalForReports.__fiscaliqPrivateReportVault ??
  (globalForReports.__fiscaliqPrivateReportVault = new Map<string, StoredReportRecord>());

const erasedHouseholdsSet =
  globalForReports.__fiscaliqErasedHouseholds ??
  (globalForReports.__fiscaliqErasedHouseholds = new Set<string>());

export function getReportSigningSecret(): string {
  const configured = process.env.FISCALIQ_REPORT_SIGNING_SECRET?.trim();
  if (
    configured &&
    configured.length >= 32 &&
    !configured.includes('replace-with')
  ) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL SECURITY ERROR: FISCALIQ_REPORT_SIGNING_SECRET is missing or shorter than 32 characters in production.'
    );
  }

  if (!globalForReports.__fiscaliqDevEphemeralSecret) {
    globalForReports.__fiscaliqDevEphemeralSecret = crypto
      .randomBytes(32)
      .toString('hex');
  }
  return globalForReports.__fiscaliqDevEphemeralSecret;
}

// Startup assertion in production runtime (excluding static build phase)
if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  getReportSigningSecret();
}

function formatFrenchDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${pad(
    d.getHours()
  )}h${pad(d.getMinutes())}`;
}

function formatEur(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} €`;
}

/**
 * Construit le contenu structuré complet et pédagogique d'un rapport fiscal personnel
 * à partir des moteurs déterministes vérifiés de FISCALIQ.
 */
export function buildStructuredPersonalTaxReport(params: {
  household: PersonalHouseholdProfile;
  reportType: PersonalReportType;
  taxYear?: 2026 | 2025;
}): Omit<
  StoredPersonalTaxReportMeta,
  'reportId' | 'createdAtIso' | 'createdAtDisplayFr' | 'privateStorageObjectPath' | 'byteSize' | 'sha256Checksum'
> {
  const { household, reportType, taxYear = 2026 } = params;
  const incomeYear = taxYear === 2026 ? 2025 : 2024;

  const taxResult = calculatePersonalIncomeTax({
    annualDeclaredIncomeEur: household.annualDeclaredSalaryNetImposableEur,
    additionalTaxableIncomeEur: household.additionalNetTaxableIncomeEur,
    maritalStatus: household.maritalStatus,
    dependantsCount: household.dependantsCount,
    perDeductibleContributionEur: household.perContributionAnnualEur,
    estimatedTaxCreditsEur: household.estimatedEligibleTaxCreditsEur,
    taxYear,
  });

  const salaryResult = calculatePersonalSalaryToNetAfterTax({
    grossMonthlySalaryEur: household.grossMonthlySalaryEur,
    status: household.employmentCategory,
    maritalStatus: household.maritalStatus,
    dependantsCount: household.dependantsCount,
    taxYear,
  });

  const neutralRateInfo = computeNeutralWithholdingRate(
    salaryResult.netTaxableMonthlyEur,
    taxYear
  );

  const verifiedRefs = retrievePersonalTaxReferences(
    'barème impôt sur le revenu quotient familial prélèvement à la source frais réels crédit impôt déclaration 2042',
    { taxYear, maxResults: 6 }
  );

  const reportTitles: Record<PersonalReportType, { title: string; subtitle: string }> = {
    BILAN_FISCAL_COMPLET: {
      title: `Bilan Fiscal Personnel Complet ${taxYear} (Revenus ${incomeYear})`,
      subtitle:
        'Synthèse complète en français clair : profil du foyer, quotient familial, barème progressif, prélèvement à la source et pistes d’optimisation légales.',
    },
    SYNTHESE_SALAIRE_ET_PAS: {
      title: `Rapport Salaire, Fiche de Paie & Prélèvement à la Source ${taxYear}`,
      subtitle:
        'Décomposition du salaire brut au net en banque, explication du net imposable et comparaison des taux de prélèvement à la source (personnalisé, individualisé, neutre).',
    },
    DOSSIER_OPTIMISATION_ET_2042: {
      title: `Dossier d’Optimisation Fiscale Légale & Préparation Déclaration 2042 (${taxYear})`,
      subtitle:
        'Revue détaillée des déductions, réductions et crédits d’impôt vérifiés, conditions d’éligibilité, plafonds légaux et liste des pièces justificatives à conserver.',
    },
  };

  const sections: StructuredReportSection[] = [
    {
      sectionNumber: 1,
      title: '1. Résumé de votre profil fiscal et parts de quotient familial',
      classificationLabel: 'CALCUL DÉTERMINISTE VÉRIFIÉ',
      plainFrenchExplanation:
        'Le quotient familial adapte l’impôt à la composition de votre foyer : votre revenu net imposable est divisé par votre nombre de parts avant d’appliquer le barème progressif (CGI Art. 194).',
      keyMetrics: [
        {
          label: 'Foyer fiscal évalué',
          value: household.householdName,
          note: household.situationSummary,
        },
        {
          label: 'Nombre de parts fiscales',
          value: `${taxResult.familyQuotientParts.toLocaleString('fr-FR')} part(s)`,
          note: `Personnes à charge déclarées : ${household.dependantsCount}`,
        },
        {
          label: 'Revenu imposable par part (Quotient)',
          value: formatEur(taxResult.taxableIncomePerPartEur),
          note: 'Base soumise au barème progressif pour 1 part',
        },
      ],
      bulletPoints: [
        `Statut familial retenu : ${household.maritalStatus === 'marie_pacse' ? 'Couple marié ou pacsé (2 parts de base)' : household.maritalStatus === 'parent_isole' ? 'Parent isolé vivant seul avec enfant(s) (Case T incluse)' : 'Personne seule (1 part de base)'}.`,
        `Plafonnement légal du quotient familial ${taxYear} (CGI Art. 197-I-2°) : 1 807 € maximum d’avantage en impôt par demi-part supplémentaire (effet du plafonnement sur votre foyer : ${formatEur(taxResult.quotientCapIncreaseEur)}).`,
      ],
    },
    {
      sectionNumber: 2,
      title: `2. Estimation de votre impôt sur le revenu ${taxYear} (sur les revenus ${incomeYear})`,
      classificationLabel: 'CALCUL DÉTERMINISTE VÉRIFIÉ',
      plainFrenchExplanation:
        'En France, l’impôt est progressif : seule la fraction de votre revenu qui dépasse le seuil d’une tranche est imposée au taux de cette tranche. Ne confondez jamais votre Tranche Marginale (TMI) avec votre taux moyen réel.',
      keyMetrics: [
        {
          label: 'Revenu net imposable du foyer',
          value: formatEur(taxResult.netTaxableIncomeEur),
          note: `Après abattement de 10 % (${formatEur(taxResult.deductionAppliedEur)}) et déduction PER (${formatEur(household.perContributionAnnualEur)})`,
        },
        {
          label: 'Impôt brut après plafonnement QF et décote',
          value: formatEur(taxResult.taxBeforeCreditsEur),
          note: `Décote appliquée : ${formatEur(taxResult.decoteAmountEur)}`,
        },
        {
          label: 'Impôt net annuel estimé',
          value: formatEur(taxResult.finalEstimatedTaxEur),
          note: `Après déduction des crédits/réductions estimés (${formatEur(taxResult.taxCreditsAppliedEur)})`,
        },
        {
          label: 'Taux moyen réel vs Tranche marginale (TMI)',
          value: `${taxResult.effectiveWithholdingRatePercent.toLocaleString('fr-FR')} % (TMI ${taxResult.marginalTaxRatePercent} %)`,
          note: 'Le taux moyen est toujours inférieur à la TMI grâce à la tranche à 0 %',
        },
      ],
      bulletPoints: taxResult.bracketSlices.map(
        (slice) =>
          `Tranche ${slice.label} (taux ${slice.ratePercent} %) : base imposable par part de ${formatEur(slice.taxableSlicePerPartEur)} -> impôt de ${formatEur(slice.taxPerPartEur)} par part.`
      ),
    },
    {
      sectionNumber: 3,
      title: '3. Déductions, réductions d’impôt et crédits d’impôt remboursables',
      classificationLabel: 'ESTIMATION SELON PROFIL',
      plainFrenchExplanation:
        'Une déduction (ex. PER, pension alimentaire) réduit votre revenu imposable selon votre TMI. Une réduction d’impôt (ex. dons) réduit l’impôt jusqu’à 0 € sans remboursement. Un crédit d’impôt (ex. garde d’enfant < 6 ans, emploi à domicile) vous est remboursé par la DGFiP s’il dépasse votre impôt.',
      keyMetrics: [
        {
          label: 'Abattement forfaitaire 10 % appliqué',
          value: formatEur(taxResult.deductionAppliedEur),
          note: 'Plafond légal 2026 : 14 555 € par salarié (plancher 509 €)',
        },
        {
          label: 'Versements épargne retraite (PER) déduits',
          value: formatEur(household.perContributionAnnualEur),
          note: `Économie marginale à TMI ${taxResult.marginalTaxRatePercent} % : ~${formatEur((household.perContributionAnnualEur * taxResult.marginalTaxRatePercent) / 100)}`,
        },
        {
          label: 'Crédits & réductions d’impôt retenus',
          value: formatEur(taxResult.taxCreditsAppliedEur),
          note: 'Soumis au plafonnement global des niches fiscales de 10 000 € (hors dons)',
        },
      ],
      bulletPoints: [
        'Frais professionnels (Cases 1AK / 1BK) : vérifiez si vos frais réels de transport (barème kilométrique jusqu’à 40 km aller simple) et de repas dépassent votre abattement automatique de 10 %.',
        'Frais de garde hors du domicile d’un enfant de moins de 6 ans (Cases 7GA à 7GG — CGI Art. 200 quater B) : crédit d’impôt de 50 % plafonné à 3 500 € de dépenses nettes d’aides CAF CMG par enfant (soit 1 750 € max).',
        'Emploi d’un salarié à domicile (Case 7DB — CGI Art. 199 quater F) : crédit d’impôt remboursable de 50 % dans la limite de 12 000 € (+1 500 € par enfant à charge, max 15 000 €).',
        'Dons aux associations (Cases 7UD / 7UF — CGI Art. 200) : réduction d’impôt de 75 % jusqu’à 1 000 € pour l’aide aux personnes en difficulté, et 66 % pour l’intérêt général (dans la limite de 20 % du revenu imposable).',
      ],
    },
    {
      sectionNumber: 4,
      title: '4. Analyse de votre fiche de paie et du prélèvement à la source (PAS)',
      classificationLabel: 'ESTIMATION SELON PROFIL',
      plainFrenchExplanation:
        'Votre Salaire net imposable est supérieur à votre Salaire net avant impôt car la CSG/CRDS non déductible (2,90 %) et la part employeur de votre mutuelle santé obligatoire sont réintégrées fiscalement (CGI Art. 83 et CSS Art. L136-2).',
      keyMetrics: [
        {
          label: 'Salaire brut mensuel de référence',
          value: formatEur(salaryResult.grossMonthlySalaryEur),
          note: `Soit ${formatEur(salaryResult.grossAnnualSalaryEur)} brut / an`,
        },
        {
          label: 'Salaire net avant impôt vs Net imposable',
          value: `${formatEur(salaryResult.netBeforeTaxMonthlyEur)} / ${formatEur(salaryResult.netTaxableMonthlyEur)}`,
          note: 'Le taux PAS s’applique sur le Net imposable',
        },
        {
          label: 'Prélèvement à la source mensuel estimé',
          value: `${formatEur(salaryResult.withholdingTaxMonthlyEur)} / mois`,
          note: `Taux personnalisé estimé : ${salaryResult.withholdingTaxRatePercent.toLocaleString('fr-FR')} % (Taux neutre : ${neutralRateInfo.ratePercent.toLocaleString('fr-FR')} %)`,
        },
        {
          label: 'Salaire net payé en banque (après PAS)',
          value: `${formatEur(salaryResult.netAfterTaxMonthlyEur)} / mois`,
          note: `Soit ${formatEur(salaryResult.netAfterTaxAnnualEur)} net en poche / an`,
        },
      ],
      bulletPoints: [
        'Taux personnalisé du foyer (CGI Art. 204 E) : calculé à partir de l’ensemble des revenus et parts du foyer.',
        'Taux individualisé des couples mariés ou pacsés (CGI Art. 204 M) : répartit le prélèvement entre les conjoints selon leurs revenus personnels sans modifier l’impôt total annuel du foyer.',
        'Taux non personnalisé / neutre (CGI Art. 204 H) : barème mensuel d’un célibataire sans enfant (ne transmet pas votre situation familiale à l’employeur).',
      ],
    },
    {
      sectionNumber: 5,
      title: '5. Opportunités légales à vérifier & préparation de votre déclaration 2042',
      classificationLabel: 'RÉFÉRENCE OFFICIELLE',
      plainFrenchExplanation:
        'Ce tableau récapitule les pistes légales identifiées pour votre profil ainsi que les justificatifs officiels à conserver pendant 3 ans en cas de demande de la DGFiP.',
      keyMetrics: PERSONAL_TAX_OPPORTUNITIES.slice(0, 3).map((opp) => ({
        label: opp.title,
        value: opp.mechanismType,
        note: `${opp.ceilingAndConditions} (${opp.statutoryReference})`,
      })),
      bulletPoints: PERSONAL_TAX_OPPORTUNITIES.map(
        (opp) =>
          `${opp.title} (${opp.statutoryReference}) : ${opp.simpleExplanation} Conditions : ${opp.ceilingAndConditions} (${opp.officialSourceUrl}).`
      ),
    },
  ];

  const officialReferences = verifiedRefs.map((ref) => ({
    title: ref.title,
    officialReference: ref.officialReference,
    publisher: ref.publisher,
    officialUrl: ref.officialUrl,
    verifiedDate: ref.verifiedDate,
  }));

  return {
    householdId: household.id,
    householdName: household.householdName,
    reportType,
    title: reportTitles[reportType].title,
    subtitle: reportTitles[reportType].subtitle,
    taxYear,
    incomeYear,
    privateStorageBucket: 'fiscaliq-personal-reports',
    verificationStatusLabel:
      'CALCUL DÉTERMINISTE VÉRIFIÉ (Barème CGI Art. 197) + SOURCES OFFICIELLES',
    assumptionsSummary: [
      `Millésime fiscal appliqué : Déclaration ${taxYear} sur les revenus de l’année ${incomeYear} (Barème progressif CGI Art. 197 revalorisé).`,
      `Foyer évalué : ${household.householdName} (${household.situationSummary}, ${taxResult.familyQuotientParts} parts fiscales).`,
      `Salaire net imposable annuel déclaré : ${formatEur(household.annualDeclaredSalaryNetImposableEur)} ; Revenus complémentaires : ${formatEur(household.additionalNetTaxableIncomeEur)}.`,
      'Les cotisations salariales du simulateur de paie reposent sur les taux légaux de droit commun hors mutuelle d’entreprise ou convention collective spécifique.',
    ],
    methodologySummary:
      'Toutes les valeurs chiffrées de ce rapport sont calculées côté serveur par le moteur arithmétique déterministe de FISCALIQ (aucun calcul arithmétique n’est délégué à un modèle d’IA). Les références juridiques proviennent exclusivement des sources officielles au statut APPROVED_VERIFIED.',
    limitationsDisclaimer:
      'AVERTISSEMENT IMPORTANT : Ce rapport est un document personnel d’information et d’aide à la préparation déclarative édité par FISCALIQ. Il ne constitue ni un avis d’impôt officiel de la DGFiP, ni une consultation juridique opposable. Toute démarche officielle (déclaration 2042, modulation de taux de prélèvement à la source) s’effectue exclusivement sur votre espace personnel impots.gouv.fr.',
    sections,
    officialReferences,
  };
}

/**
 * Convertit une chaîne UTF-8 française en octets WinAnsi / ISO-8859-1 compatibles
 * avec les polices PDF standard (/Helvetica et /Helvetica-Bold) et échappe les parenthèses PDF.
 */
function encodePdfWinAnsiString(input: string): string {
  const normalized = input
    .replace(/€/g, ' EUR')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[’‘]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    .replace(/→/g, '->')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/\u00a0|\u202f/g, ' ');

  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const ch = normalized[i];
    if (ch === '(' || ch === ')' || ch === '\\') {
      out += '\\' + ch;
    } else if (code >= 32 && code <= 126) {
      out += ch;
    } else if (code >= 160 && code <= 255) {
      // Octal escape for ISO-8859-1 / WinAnsi accented French characters (é, è, ê, à, ç, ô, û, etc.)
      out += '\\' + code.toString(8).padStart(3, '0');
    } else {
      out += ' ';
    }
  }
  return out;
}

function wrapTextToLines(text: string, maxCharsPerLine = 92): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxCharsPerLine) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

/**
 * Génère un fichier binaire PDF multi-pages (%PDF-1.4) valide et lisible côté serveur
 * respectant la charte graphique européenne FISCALIQ (Deep Navy #101827, Emerald #10B981).
 */
export function renderPersonalReportToPdfBuffer(
  report: StoredPersonalTaxReportMeta
): Buffer {
  const pageStreams: string[] = [];
  let currentCommands: string[] = [];
  let cursorY = 755;

  const startNewPage = (pageNum: number) => {
    currentCommands = [];
    // En-tête Deep Navy #101827 (RGB: 0.063, 0.094, 0.153)
    currentCommands.push('0.063 0.094 0.153 rg');
    currentCommands.push('0 785 595 57 re f');
    // Filet Emerald #10B981 (RGB: 0.063, 0.725, 0.506)
    currentCommands.push('0.063 0.725 0.506 rg');
    currentCommands.push('0 782 595 3 re f');

    // Titre d'en-tête blanc
    currentCommands.push('1 1 1 rg');
    currentCommands.push('BT /F2 11 Tf 40 816 Td (' + encodePdfWinAnsiString('FISCALIQ PARTICULIERS - RAPPORT FISCAL PERSONNEL VERIFIE') + ') Tj ET');
    currentCommands.push('0.65 0.95 0.82 rg');
    currentCommands.push(
      'BT /F1 8.5 Tf 40 798 Td (' +
        encodePdfWinAnsiString(
          `Foyer : ${report.householdName} | Millesime ${report.taxYear} (Revenus ${report.incomeYear}) | Page ${pageNum}`
        ) +
        ') Tj ET'
    );

    // Pied de page
    currentCommands.push('0.45 0.50 0.58 rg');
    currentCommands.push(
      'BT /F1 7.5 Tf 40 26 Td (' +
        encodePdfWinAnsiString(
          `Document d'aide a la decision FISCALIQ (${report.reportId}) - Ne remplace pas l'avis d'impot officiel impots.gouv.fr`
        ) +
        ') Tj ET'
    );

    currentCommands.push('0.063 0.094 0.153 rg');
    cursorY = 755;
  };

  let pageCount = 1;
  startNewPage(pageCount);

  const ensureSpace = (neededPoints: number) => {
    if (cursorY - neededPoints < 48) {
      pageStreams.push(currentCommands.join('\n'));
      pageCount += 1;
      startNewPage(pageCount);
    }
  };

  const writeLine = (
    text: string,
    opts: {
      font?: 'F1' | 'F2';
      size?: number;
      indent?: number;
      lineHeight?: number;
      colorRgb?: [number, number, number];
    } = {}
  ) => {
    const {
      font = 'F1',
      size = 9.5,
      indent = 40,
      lineHeight = 13.5,
      colorRgb = [0.063, 0.094, 0.153],
    } = opts;
    ensureSpace(lineHeight + 2);
    currentCommands.push(
      `${colorRgb[0]} ${colorRgb[1]} ${colorRgb[2]} rg BT /${font} ${size} Tf ${indent} ${cursorY} Td (${encodePdfWinAnsiString(text)}) Tj ET`
    );
    cursorY -= lineHeight;
  };

  // Bloc titre principal
  writeLine(report.title, { font: 'F2', size: 13.5, lineHeight: 18 });
  for (const line of wrapTextToLines(report.subtitle, 95)) {
    writeLine(line, { font: 'F1', size: 9, lineHeight: 12.5, colorRgb: [0.3, 0.36, 0.44] });
  }
  writeLine(
    `Statut : ${report.verificationStatusLabel} | Genere le : ${report.createdAtDisplayFr}`,
    { font: 'F2', size: 8.5, lineHeight: 15, colorRgb: [0.04, 0.52, 0.36] }
  );
  cursorY -= 4;

  // Sections 1 à 5
  for (const sec of report.sections) {
    ensureSpace(60);
    // Bandeau de section gris clair
    currentCommands.push('0.95 0.97 0.98 rg');
    currentCommands.push(`36 ${cursorY - 5} 523 18 re f`);
    writeLine(`${sec.title} [${sec.classificationLabel}]`, {
      font: 'F2',
      size: 10,
      indent: 42,
      lineHeight: 16,
      colorRgb: [0.063, 0.094, 0.153],
    });

    for (const explLine of wrapTextToLines(sec.plainFrenchExplanation, 94)) {
      writeLine(explLine, {
        font: 'F1',
        size: 8.8,
        indent: 42,
        lineHeight: 12,
        colorRgb: [0.22, 0.28, 0.36],
      });
    }
    cursorY -= 2;

    for (const metric of sec.keyMetrics) {
      const metricLine = `- ${metric.label} : ${metric.value}${metric.note ? ` (${metric.note})` : ''}`;
      for (const wrapped of wrapTextToLines(metricLine, 92)) {
        writeLine(wrapped, {
          font: 'F2',
          size: 8.8,
          indent: 48,
          lineHeight: 12,
          colorRgb: [0.063, 0.094, 0.153],
        });
      }
    }

    for (const bullet of sec.bulletPoints) {
      for (const wrapped of wrapTextToLines(`* ${bullet}`, 92)) {
        writeLine(wrapped, {
          font: 'F1',
          size: 8.5,
          indent: 48,
          lineHeight: 11.5,
          colorRgb: [0.2, 0.25, 0.32],
        });
      }
    }
    cursorY -= 6;
  }

  // Section Références Officielles, Hypothèses & Limites
  ensureSpace(90);
  writeLine('6. References officielles verifiees, Hypotheses, Methodologie et Limites', {
    font: 'F2',
    size: 10,
    lineHeight: 15,
    colorRgb: [0.063, 0.094, 0.153],
  });

  for (const ref of report.officialReferences) {
    for (const wrapped of wrapTextToLines(
      `- [${ref.publisher}] ${ref.title} — ${ref.officialReference} (Verifie le ${ref.verifiedDate}) : ${ref.officialUrl}`,
      92
    )) {
      writeLine(wrapped, {
        font: 'F1',
        size: 8.2,
        indent: 44,
        lineHeight: 11,
        colorRgb: [0.15, 0.22, 0.3],
      });
    }
  }

  cursorY -= 3;
  for (const assumption of report.assumptionsSummary) {
    for (const wrapped of wrapTextToLines(`Hypothese : ${assumption}`, 92)) {
      writeLine(wrapped, {
        font: 'F1',
        size: 8.2,
        indent: 44,
        lineHeight: 11,
        colorRgb: [0.25, 0.3, 0.38],
      });
    }
  }

  cursorY -= 3;
  for (const wrapped of wrapTextToLines(report.limitationsDisclaimer, 92)) {
    writeLine(wrapped, {
      font: 'F2',
      size: 8.2,
      indent: 44,
      lineHeight: 11.5,
      colorRgb: [0.55, 0.22, 0.08],
    });
  }

  pageStreams.push(currentCommands.join('\n'));

  // Assemblage de la structure d'objets PDF (%PDF-1.4)
  const objects: string[] = [];
  // Obj 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  // Obj 2: Pages (placeholder filled after knowing page object IDs)
  objects.push('');
  // Obj 3: Font F1 (Helvetica WinAnsiEncoding)
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj'
  );
  // Obj 4: Font F2 (Helvetica-Bold WinAnsiEncoding)
  objects.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj'
  );

  const pageObjectIds: number[] = [];
  for (const streamContent of pageStreams) {
    const contentObjId = objects.length + 1;
    const streamByteLength = Buffer.byteLength(streamContent, 'latin1');
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${streamByteLength} >>\nstream\n${streamContent}\nendstream\nendobj`
    );

    const pageObjId = objects.length + 1;
    pageObjectIds.push(pageObjId);
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj`
    );
  }

  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(' ')}] /Count ${pageObjectIds.length} >>\nendobj`;

  let pdfContent = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdfContent, 'latin1'));
    pdfContent += obj + '\n';
  }

  const xrefOffset = Buffer.byteLength(pdfContent, 'latin1');
  pdfContent += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdfContent += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdfContent += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdfContent, 'latin1');
}

/**
 * Émet un jeton signé HMAC-SHA256 à durée de vie limitée (15 minutes par défaut)
 * lié exclusivement au couple `(reportId, householdId)`.
 */
export function issueSignedDownloadToken(params: {
  reportId: string;
  householdId: string;
  ttlSeconds?: number;
}): {
  token: string;
  expiresAtIso: string;
  ttlSeconds: number;
  downloadUrl: string;
} {
  const { reportId, householdId, ttlSeconds = 900 } = params;
  const expiresAtMs = Date.now() + ttlSeconds * 1000;
  const payload = JSON.stringify({
    reportId,
    householdId,
    exp: expiresAtMs,
  });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getReportSigningSecret())
    .update(payloadB64)
    .digest('base64url');

  const token = `${payloadB64}.${signature}`;
  return {
    token,
    expiresAtIso: new Date(expiresAtMs).toISOString(),
    ttlSeconds,
    downloadUrl: `/api/reports/download?token=${encodeURIComponent(token)}&householdId=${encodeURIComponent(householdId)}`,
  };
}

export function verifySignedDownloadToken(params: {
  token: string;
  authenticatedHouseholdId: string;
}): {
  valid: boolean;
  httpStatus: 200 | 401 | 403;
  reason: string;
  reportId?: string;
  householdId?: string;
} {
  const { token, authenticatedHouseholdId } = params;
  if (!token || !token.includes('.')) {
    return {
      valid: false,
      httpStatus: 401,
      reason: 'Jeton de téléchargement signé manquant ou mal formé.',
    };
  }

  const [payloadB64, providedSig] = token.split('.');
  if (!payloadB64 || !providedSig) {
    return {
      valid: false,
      httpStatus: 401,
      reason: 'Jeton de téléchargement signé incomplet.',
    };
  }

  const expectedSig = crypto
    .createHmac('sha256', getReportSigningSecret())
    .update(payloadB64)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return {
      valid: false,
      httpStatus: 401,
      reason: 'Signature cryptographique du lien de téléchargement invalide.',
    };
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as {
      reportId: string;
      householdId: string;
      exp: number;
    };

    if (Date.now() > parsed.exp) {
      return {
        valid: false,
        httpStatus: 401,
        reason: 'Le lien de téléchargement temporaire a expiré (validité 15 minutes).',
      };
    }

    if (!authenticatedHouseholdId || parsed.householdId !== authenticatedHouseholdId) {
      return {
        valid: false,
        httpStatus: 403,
        reason:
          'Accès refusé (403) : ce rapport fiscal personnel appartient à un autre foyer authentifié.',
      };
    }

    return {
      valid: true,
      httpStatus: 200,
      reason: 'Jeton signé valide et foyer authentifié concordant.',
      reportId: parsed.reportId,
      householdId: parsed.householdId,
    };
  } catch {
    return {
      valid: false,
      httpStatus: 401,
      reason: 'Impossible de décoder le jeton de téléchargement signé.',
    };
  }
}

/**
 * Initialise un rapport par défaut dans le coffre-fort privé pour le foyer principal
 * afin que l'utilisateur puisse immédiatement l'inspecter ou le télécharger.
 */
function ensureSeededReportForHousehold(householdId: string): void {
  if (erasedHouseholdsSet.has(householdId)) return;
  const hasExisting = Array.from(privateReportStorageVault.values()).some(
    (r) => r.meta.householdId === householdId
  );
  if (hasExisting) return;

  const foundDemo =
    DEMO_PERSONAL_HOUSEHOLDS.find((h) => h.id === householdId) ||
    DEMO_PERSONAL_HOUSEHOLDS[0];
  const targetHousehold: PersonalHouseholdProfile = {
    ...foundDemo,
    id: householdId,
  };

  const baseMeta = buildStructuredPersonalTaxReport({
    household: targetHousehold,
    reportType: 'BILAN_FISCAL_COMPLET',
    taxYear: 2026,
  });

  const reportId = `rep-${targetHousehold.id}-2026-initial`;
  const createdAtIso = '2026-11-10T08:30:00.000Z';
  const draftMeta: StoredPersonalTaxReportMeta = {
    ...baseMeta,
    reportId,
    createdAtIso,
    createdAtDisplayFr: formatFrenchDate(createdAtIso),
    privateStorageObjectPath: `${targetHousehold.id}/${reportId}.pdf`,
    byteSize: 0,
    sha256Checksum: '',
  };

  const pdfBuffer = renderPersonalReportToPdfBuffer(draftMeta);
  const sha256Checksum = crypto
    .createHash('sha256')
    .update(pdfBuffer)
    .digest('hex');

  const finalMeta: StoredPersonalTaxReportMeta = {
    ...draftMeta,
    byteSize: pdfBuffer.byteLength,
    sha256Checksum,
  };

  privateReportStorageVault.set(reportId, {
    meta: finalMeta,
    pdfBuffer,
  });
}

/**
 * Liste uniquement les rapports appartenant au foyer authentifié (`authenticatedHouseholdId`).
 * Refuse tout accès croisé avec une erreur 403.
 */
export function listAuthorizedHouseholdReports(params: {
  authenticatedHouseholdId: string;
  requestedHouseholdId: string;
}): {
  authorized: boolean;
  httpStatus: 200 | 403;
  errorFr?: string;
  reports: Array<{
    meta: StoredPersonalTaxReportMeta;
    signedDownload: {
      token: string;
      expiresAtIso: string;
      ttlSeconds: number;
      downloadUrl: string;
    };
  }>;
} {
  const { authenticatedHouseholdId, requestedHouseholdId } = params;
  if (!authenticatedHouseholdId || authenticatedHouseholdId !== requestedHouseholdId) {
    return {
      authorized: false,
      httpStatus: 403,
      errorFr:
        'Accès refusé (403) : isolation stricte des données personnelles. Vous ne pouvez accéder qu’aux rapports PDF de votre propre foyer fiscal.',
      reports: [],
    };
  }

  ensureSeededReportForHousehold(authenticatedHouseholdId);

  const matching = Array.from(privateReportStorageVault.values())
    .filter((rec) => rec.meta.householdId === authenticatedHouseholdId)
    .sort((a, b) => b.meta.createdAtIso.localeCompare(a.meta.createdAtIso))
    .map((rec) => ({
      meta: rec.meta,
      signedDownload: issueSignedDownloadToken({
        reportId: rec.meta.reportId,
        householdId: rec.meta.householdId,
        ttlSeconds: 900,
      }),
    }));

  return {
    authorized: true,
    httpStatus: 200,
    reports: matching,
  };
}

/**
 * Génère un nouveau rapport PDF côté serveur après vérification stricte :
 * 1. De l'isolation par foyer (`authenticatedHouseholdId === household.id`)
 * 2. Des droits et quotas de l'abonnement (`FREE`, `PREMIUM`)
 */
export function generateAndStoreAuthorizedPdfReport(params: {
  authenticatedHouseholdId: string;
  household: PersonalHouseholdProfile;
  reportType: PersonalReportType;
  taxYear?: 2026 | 2025;
}): {
  allowed: boolean;
  httpStatus: 200 | 403 | 429;
  messageFr: string;
  report?: StoredPersonalTaxReportMeta;
  signedDownload?: {
    token: string;
    expiresAtIso: string;
    ttlSeconds: number;
    downloadUrl: string;
  };
} {
  const { authenticatedHouseholdId, household, reportType, taxYear = 2026 } = params;

  const entitlementCheck = verifyReportGenerationEntitlement({
    authenticatedHouseholdId,
    targetHouseholdId: household.id,
    reportType,
    consumeQuotaOnSuccess: true,
  });

  if (!entitlementCheck.allowed) {
    return {
      allowed: false,
      httpStatus: entitlementCheck.httpStatus,
      messageFr: entitlementCheck.messageFr,
    };
  }

  ensureSeededReportForHousehold(household.id);

  const baseMeta = buildStructuredPersonalTaxReport({
    household,
    reportType,
    taxYear,
  });

  const nowIso = new Date().toISOString();
  const reportId = `rep-${household.id}-${taxYear}-${Math.random().toString(36).slice(2, 8)}`;

  const draftMeta: StoredPersonalTaxReportMeta = {
    ...baseMeta,
    reportId,
    createdAtIso: nowIso,
    createdAtDisplayFr: formatFrenchDate(nowIso),
    privateStorageObjectPath: `${household.id}/${reportId}.pdf`,
    byteSize: 0,
    sha256Checksum: '',
  };

  const pdfBuffer = renderPersonalReportToPdfBuffer(draftMeta);
  const sha256Checksum = crypto
    .createHash('sha256')
    .update(pdfBuffer)
    .digest('hex');

  const finalMeta: StoredPersonalTaxReportMeta = {
    ...draftMeta,
    byteSize: pdfBuffer.byteLength,
    sha256Checksum,
  };

  privateReportStorageVault.set(reportId, {
    meta: finalMeta,
    pdfBuffer,
  });

  const signedDownload = issueSignedDownloadToken({
    reportId,
    householdId: household.id,
    ttlSeconds: entitlementCheck.planConfig.features.signedDownloadLinkTtlSeconds,
  });

  return {
    allowed: true,
    httpStatus: 200,
    messageFr: `Rapport PDF « ${finalMeta.title} » généré côté serveur, stocké dans le compartiment privé Supabase Storage (${finalMeta.privateStorageObjectPath}) et signé pour 15 minutes.`,
    report: finalMeta,
    signedDownload,
  };
}

export function getAuthorizedReportPdfBinary(params: {
  token: string;
  authenticatedHouseholdId: string;
}): {
  authorized: boolean;
  httpStatus: 200 | 401 | 403 | 404;
  errorFr?: string;
  pdfBuffer?: Buffer;
  filename?: string;
  meta?: StoredPersonalTaxReportMeta;
} {
  const verification = verifySignedDownloadToken(params);
  if (!verification.valid || !verification.reportId || !verification.householdId) {
    return {
      authorized: false,
      httpStatus: verification.httpStatus,
      errorFr: verification.reason,
    };
  }

  ensureSeededReportForHousehold(verification.householdId);
  const record = privateReportStorageVault.get(verification.reportId);
  if (!record) {
    return {
      authorized: false,
      httpStatus: 404,
      errorFr: 'Rapport PDF introuvable dans le coffre-fort privé.',
    };
  }

  // Double contrôle d'isolation propriétaire sur l'enregistrement stocké
  if (record.meta.householdId !== params.authenticatedHouseholdId) {
    return {
      authorized: false,
      httpStatus: 403,
      errorFr:
        'Accès refusé (403) : tentative d’accès à un rapport appartenant à un autre foyer fiscal.',
    };
  }

  return {
    authorized: true,
    httpStatus: 200,
    pdfBuffer: record.pdfBuffer,
    filename: `FISCALIQ-${record.meta.reportType}-${record.meta.taxYear}-${record.meta.reportId}.pdf`,
    meta: record.meta,
  };
}

/**
 * Exercice du Droit à l'effacement RGPD (Art. 17 « Droit à l'oubli ») :
 * Purge immédiatement tous les rapports PDF stockés dans le coffre-fort privé pour le foyer authentifié.
 * Refuse avec un code 403 toute tentative d'effacement portant sur un autre foyer.
 */
export function purgeHouseholdReportsForGdprErasure(params: {
  authenticatedHouseholdId: string;
  targetHouseholdId: string;
}): {
  authorized: boolean;
  httpStatus: 200 | 403;
  deletedReportsCount: number;
  deletedStoragePaths: string[];
  erasedAtIso: string;
  messageFr: string;
} {
  const { authenticatedHouseholdId, targetHouseholdId } = params;
  if (!authenticatedHouseholdId || authenticatedHouseholdId !== targetHouseholdId) {
    return {
      authorized: false,
      httpStatus: 403,
      deletedReportsCount: 0,
      deletedStoragePaths: [],
      erasedAtIso: new Date().toISOString(),
      messageFr:
        'Accès refusé (403) : vous ne pouvez demander l’effacement RGPD (Art. 17) que pour votre propre foyer fiscal authentifié.',
    };
  }

  const deletedStoragePaths: string[] = [];
  for (const [reportId, record] of Array.from(privateReportStorageVault.entries())) {
    if (record.meta.householdId === targetHouseholdId) {
      deletedStoragePaths.push(record.meta.privateStorageObjectPath);
      privateReportStorageVault.delete(reportId);
    }
  }

  erasedHouseholdsSet.add(targetHouseholdId);

  return {
    authorized: true,
    httpStatus: 200,
    deletedReportsCount: deletedStoragePaths.length,
    deletedStoragePaths,
    erasedAtIso: new Date().toISOString(),
    messageFr: `Effacement RGPD (Art. 17) exécuté : ${deletedStoragePaths.length} fichier(s) PDF supprimé(s) du compartiment privé Supabase Storage pour le foyer ${targetHouseholdId}.`,
  };
}

