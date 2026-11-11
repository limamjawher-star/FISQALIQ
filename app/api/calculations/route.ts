import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  calculateCorporateTax,
  calculatePayrollEmployerCost,
  calculateProfitabilityMetrics,
} from '@/lib/calculations/engine';
import {
  calculatePersonalIncomeTax,
  calculateDetailedPersonalSalary,
} from '@/lib/calculations/personal-tax-engine';
import {
  corporateTaxSchema,
  payrollSimulationSchema,
  profitabilitySchema,
} from '@/lib/validation/schemas';
import {
  enforceApiRateLimit,
  extractClientIdentifier,
  verifyRequestOriginAndCsrf,
} from '@/lib/security/security-audit-and-gdpr';

const personalIncomeTaxApiSchema = z.object({
  annualDeclaredIncomeEur: z.number().min(0).max(10_000_000),
  additionalTaxableIncomeEur: z.number().min(0).max(10_000_000).optional(),
  maritalStatus: z.enum([
    'celibataire',
    'marie_pacse',
    'parent_isole',
    'divorce_separe',
    'veuf',
  ]),
  dependantsCount: z.number().int().min(0).max(15),
  perDeductibleContributionEur: z.number().min(0).max(500_000).optional(),
  estimatedTaxCreditsEur: z.number().min(0).max(200_000).optional(),
  taxYear: z.union([z.literal(2026), z.literal(2025)]).optional().default(2026),
});

const personalSalaryPasApiSchema = z.object({
  grossMonthlySalaryEur: z.number().min(500).max(250_000),
  status: z.enum(['non_cadre', 'cadre', 'fonction_publique']),
  maritalStatus: z.enum([
    'celibataire',
    'marie_pacse',
    'parent_isole',
    'divorce_separe',
    'veuf',
  ]),
  dependantsCount: z.number().int().min(0).max(15),
  taxYear: z.union([z.literal(2026), z.literal(2025)]).optional().default(2026),
});

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = verifyRequestOriginAndCsrf(req);
    if (!csrfCheck.allowed) {
      return NextResponse.json(
        { error: csrfCheck.reasonFr || 'Requête inter-site non autorisée.' },
        { status: 403 }
      );
    }

    const rateLimit = enforceApiRateLimit({
      category: 'TAX_CALCULATOR',
      clientIdentifier: extractClientIdentifier(req),
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Trop de requêtes de calcul (${rateLimit.limit}/min). Réessayez dans ${rateLimit.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { calculationType, payload } = body;

    if (calculationType === 'personal_income_tax') {
      const parsed = personalIncomeTaxApiSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Paramètres d’impôt sur le revenu invalides.', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = calculatePersonalIncomeTax(parsed.data);
      return NextResponse.json({ result });
    }

    if (calculationType === 'personal_salary_pas') {
      const parsed = personalSalaryPasApiSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Paramètres de salaire et prélèvement à la source invalides.', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = calculateDetailedPersonalSalary({
        entryMode: 'STATUTORY_ESTIMATE',
        ...parsed.data,
      });
      return NextResponse.json({ result });
    }

    if (calculationType === 'corporate_tax') {
      const parsed = corporateTaxSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Paramètres fiscaux invalides.', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = calculateCorporateTax(parsed.data);
      return NextResponse.json({ result });
    }

    if (calculationType === 'payroll_cost') {
      const parsed = payrollSimulationSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Paramètres de paie invalides.', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = calculatePayrollEmployerCost(parsed.data);
      return NextResponse.json({ result });
    }

    if (calculationType === 'profitability') {
      const parsed = profitabilitySchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Paramètres de rentabilité invalides.', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = calculateProfitabilityMetrics(parsed.data);
      return NextResponse.json({ result });
    }

    return NextResponse.json(
      {
        error:
          'Type de calcul non reconnu. Utilisez personal_income_tax, personal_salary_pas, corporate_tax, payroll_cost ou profitability.',
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Erreur serveur lors de l’exécution du moteur de calcul déterministe.' },
      { status: 500 }
    );
  }
}
