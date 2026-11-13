/**
 * FISCALIQ — Extracteur d'Avis d'Impôt et de Fiche de Paie (Déterministe + Gemini Multimodal)
 *
 * Ce module permet d'extraire automatiquement les montants fiscaux utiles :
 * - Revenu net imposable annuel (case 1AJ)
 * - Salaire brut mensuel
 * - Impôt déjà prélevé à la source (PAS annuel retenu)
 * - Taux de prélèvement à la source (%)
 * - Plafond d'épargne retraite PER disponible (case 6NS)
 * - Nombre de parts fiscales
 *
 * SÉCURITÉ & RGPD :
 * - Aucun numéro fiscal (SPI à 13 chiffres), numéro de sécurité sociale (NIR à 15 chiffres)
 *   ou IBAN n'est conservé : `redactPersonalIdentifiers` masque toutes les données sensibles
 *   avant l'extraction.
 */

import { enforceDataMinimizationOnInput } from '@/lib/security/security-audit-and-gdpr';

export interface ScannedFiscalDocumentResult {
  documentTypeDetected: 'AVIS_IMPOT' | 'FICHE_DE_PAIE' | 'INCONNU';
  annualNetTaxableSalaryEur: number | null;
  grossMonthlySalaryEur: number | null;
  withheldPasAnnualEur: number | null;
  withholdingRatePercent: number | null;
  availablePerCeilingEur: number | null;
  familyQuotientParts: number | null;
  redactedPiiCount: number;
  extractedFieldsSummaryFr: string[];
  extractionMethod: 'DETERMINISTIC_PARSER' | 'GEMINI_MULTIMODAL';
}

function parseFrenchNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/\u00a0/g, '')
    .replace(/\s+/g, '')
    .replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Analyse déterministe par expressions régulières d'un texte copié depuis un avis d'impôt
 * ou un bulletin de paie de décembre.
 */
export function parseFiscalDocumentTextDeterministically(
  rawText: string
): ScannedFiscalDocumentResult {
  const redaction = enforceDataMinimizationOnInput(rawText || '');
  const text = redaction.redactedText;
  const lower = text.toLowerCase();

  const isAvis =
    lower.includes('avis d') ||
    lower.includes('1aj') ||
    lower.includes('revenu fiscal de référence') ||
    lower.includes('plafond épargne retraite');
  const isPayslip =
    lower.includes('bulletin de paie') ||
    lower.includes('bulletin de salaire') ||
    lower.includes('net imposable') ||
    lower.includes('salaire brut');

  const documentTypeDetected: ScannedFiscalDocumentResult['documentTypeDetected'] =
    isAvis ? 'AVIS_IMPOT' : isPayslip ? 'FICHE_DE_PAIE' : 'INCONNU';

  let annualNetTaxableSalaryEur: number | null = null;
  let grossMonthlySalaryEur: number | null = null;
  let withheldPasAnnualEur: number | null = null;
  let withholdingRatePercent: number | null = null;
  let availablePerCeilingEur: number | null = null;
  let familyQuotientParts: number | null = null;
  const extractedFieldsSummaryFr: string[] = [];

  // 1. Salaires nets imposables (1AJ ou Net imposable cumulé / annuel)
  const match1AJ = text.match(
    /(?:1aj|salaires?\s+nets?\s+imposables?|cumul\s+net\s+imposable|net\s+imposable\s+annuel)[^\d]{1,35}(\d[\d\s\u00a0]{1,9}(?:[.,]\d{1,2})?)/i
  );
  if (match1AJ?.[1]) {
    const val = parseFrenchNumber(match1AJ[1]);
    if (val !== null && val >= 500 && val <= 2000000) {
      annualNetTaxableSalaryEur = Math.round(val);
      extractedFieldsSummaryFr.push(
        `Salaires nets imposables (1AJ) : ${annualNetTaxableSalaryEur.toLocaleString('fr-FR')} €`
      );
    }
  }

  // 2. Salaire brut mensuel
  const matchBrut = text.match(
    /(?:salaire\s+brut\s+mensuel|salaire\s+de\s+base|total\s+brut)[^\d]{1,30}(\d[\d\s\u00a0]{1,7}(?:[.,]\d{1,2})?)/i
  );
  if (matchBrut?.[1]) {
    const val = parseFrenchNumber(matchBrut[1]);
    if (val !== null && val >= 200 && val <= 200000) {
      grossMonthlySalaryEur = Math.round(val);
      extractedFieldsSummaryFr.push(
        `Salaire brut mensuel : ${grossMonthlySalaryEur.toLocaleString('fr-FR')} €`
      );
    }
  }

  // 3. Prélèvement à la source déjà retenu
  const matchPas = text.match(
    /(?:retenue\s+à\s+la\s+source|prélèvement\s+à\s+la\s+source\s+(?:déjà\s+)?(?:prélevé|retenu|payé)|cumul\s+pas|impôt\s+prélevé\s+à\s+la\s+source)[^\d]{1,35}(\d[\d\s\u00a0]{1,8}(?:[.,]\d{1,2})?)/i
  );
  if (matchPas?.[1]) {
    const val = parseFrenchNumber(matchPas[1]);
    if (val !== null && val >= 0 && val <= 1000000) {
      withheldPasAnnualEur = Math.round(val);
      extractedFieldsSummaryFr.push(
        `Prélèvement à la source retenu : ${withheldPasAnnualEur.toLocaleString('fr-FR')} €`
      );
    }
  }

  // 4. Taux de prélèvement à la source (%)
  const matchRate = text.match(
    /(?:taux\s+(?:de\s+)?prélèvement(?:\s+à\s+la\s+source)?|taux\s+pas|taux\s+personnalisé)[^\d]{1,25}(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i
  );
  if (matchRate?.[1]) {
    const val = parseFrenchNumber(matchRate[1]);
    if (val !== null && val >= 0 && val <= 45) {
      withholdingRatePercent = val;
      extractedFieldsSummaryFr.push(
        `Taux de prélèvement : ${withholdingRatePercent.toLocaleString('fr-FR')} %`
      );
    }
  }

  // 5. Plafond épargne retraite disponible (6NS)
  const matchPer = text.match(
    /(?:plafond\s+(?:épargne\s+retraite|per|global|disponible)|6ns)[^\d]{1,35}(\d[\d\s\u00a0]{2,7})/i
  );
  if (matchPer?.[1]) {
    const val = parseFrenchNumber(matchPer[1]);
    if (val !== null && val >= 500 && val <= 150000) {
      availablePerCeilingEur = Math.round(val);
      extractedFieldsSummaryFr.push(
        `Plafond PER disponible : ${availablePerCeilingEur.toLocaleString('fr-FR')} €`
      );
    }
  }

  // 6. Nombre de parts
  const matchParts = text.match(
    /(?:nombre\s+de\s+parts|quotient\s+familial)[^\d]{1,25}(\d(?:[.,]\d{1,2})?)/i
  );
  if (matchParts?.[1]) {
    const val = parseFrenchNumber(matchParts[1]);
    if (val !== null && val >= 1 && val <= 12) {
      familyQuotientParts = val;
      extractedFieldsSummaryFr.push(
        `Parts fiscales : ${familyQuotientParts.toLocaleString('fr-FR')}`
      );
    }
  }

  return {
    documentTypeDetected,
    annualNetTaxableSalaryEur,
    grossMonthlySalaryEur,
    withheldPasAnnualEur,
    withholdingRatePercent,
    availablePerCeilingEur,
    familyQuotientParts,
    redactedPiiCount: redaction.detectedCategories.length,
    extractedFieldsSummaryFr,
    extractionMethod: 'DETERMINISTIC_PARSER',
  };
}
