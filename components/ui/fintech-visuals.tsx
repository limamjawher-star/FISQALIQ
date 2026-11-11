'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  Layers,
  Sparkles,
  Scale,
  ArrowUpRight,
  CheckCircle2,
  SlidersHorizontal,
  Wallet,
  Calculator,
  FileCheck2,
  Building2,
  Info,
} from 'lucide-react';
import { PersonalBracketSliceResult } from '@/lib/calculations/personal-tax-engine';
import { formatFrenchEuros } from '@/lib/calculations/engine';

/**
 * FISCALIQ — Original Art Direction & Visual Asset Library
 * Aesthetic: Futuristic French Personal Tax Fintech
 * Palette: Gallery White (#FFFFFF), Alabaster (#F8FAFC), Deep Navy (#101827 / #172033), Emerald (#10B981)
 *
 * All images use Next.js <Image> with:
 * - referrerPolicy="no-referrer"
 * - explicit dimensions / reserved aspect ratio containers to prevent CLS
 * - responsive sizes attribute
 * - AVIF/WebP optimization via next.config.ts
 * - priority for above-the-fold or lazy loading below the fold
 */

export interface Editorial3DClarityCardProps {
  taxYear: number;
  effectiveRatePercent: number;
  marginalRatePercent: number;
  familyParts: number;
  priority?: boolean;
}

/**
 * 1. Bespoke 3D Financial Clarity Sculpture Showcase
 * Uses local high-resolution 3D asset (/assets/visuals/hero-3d-clarity.jpg)
 * with live interactive telemetry overlay.
 */
export function Editorial3DClarityCard({
  taxYear,
  effectiveRatePercent,
  marginalRatePercent,
  familyParts,
  priority = false,
}: Editorial3DClarityCardProps) {
  return (
    <figure className="relative rounded-xl overflow-hidden border border-[#E8EDF2] bg-[#F8FAFC] shadow-xs group">
      {/* Reserved 16:9 aspect container to eliminate Cumulative Layout Shift (CLS) */}
      <div className="relative w-full aspect-16/9 bg-slate-100 overflow-hidden">
        <Image
          src="/assets/visuals/hero-3d-clarity.jpg"
          alt="Sculpture 3D minimaliste en verre émeraude dépoli et aluminium brossé illustrant la clarté fiscale et l’organisation budgétaire FISCALIQ"
          fill
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
          referrerPolicy="no-referrer"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
        />
        {/* Subtle gradient scrim for live telemetry legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#101827]/75 via-[#101827]/15 to-transparent"
        />

        {/* Top-left badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md border border-white/60 shadow-2xs text-[10px] font-mono font-semibold text-[#101827]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>ARCHITECTURE DÉTERMINISTE · CGI {taxYear}</span>
        </div>

        {/* Bottom live telemetry overlay */}
        <div className="absolute bottom-3 left-3 right-3 p-3 rounded-lg bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#10B981] shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                SYNTHÈSE DU FOYER EN TEMPS RÉEL
              </p>
              <p className="font-bold text-[#101827] text-xs">
                {familyParts.toLocaleString('fr-FR')} {familyParts > 1 ? 'parts' : 'part'} · Taux réel{' '}
                <span className="text-emerald-700 font-mono">{effectiveRatePercent.toFixed(1)} %</span>
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] text-slate-500 block">Tranche max (TMI)</span>
            <span className="text-xs font-bold text-[#101827]">{marginalRatePercent} %</span>
          </div>
        </div>
      </div>
    </figure>
  );
}

/**
 * 2. Interactive Progressive Tax Brackets Staircase & Sculpture Visualizer
 * Combines our bespoke 3D ascending steps artwork (/assets/visuals/tax-harmony-sculpture.jpg)
 * with an interactive live-calculated CSS visualization of the 5 official CGI Art. 197 brackets.
 */
export interface TaxBracketsInteractiveVisualizerProps {
  bracketSlices: PersonalBracketSliceResult[];
  familyQuotientParts: number;
  taxableIncomePerPartEur: number;
  marginalTaxRatePercent: number;
  effectiveRatePercent: number;
}

export function TaxBracketsInteractiveVisualizer({
  bracketSlices,
  familyQuotientParts,
  taxableIncomePerPartEur,
  marginalTaxRatePercent,
  effectiveRatePercent,
}: TaxBracketsInteractiveVisualizerProps) {
  const [selectedBracketRate, setSelectedBracketRate] = useState<number | null>(null);

  const activeSlice =
    bracketSlices.find((b) => b.ratePercent === selectedBracketRate) ||
    bracketSlices.find((b) => b.ratePercent === marginalTaxRatePercent) ||
    bracketSlices[0];

  const maxSliceCeiling = 60000;

  return (
    <div className="rounded-xl border border-[#E8EDF2] bg-white p-4 sm:p-5 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
            VISUALISATION INTERACTIVE · CGI ART. 197
          </span>
          <h3 className="text-sm sm:text-base font-bold text-[#101827]">
            L’escalier progressif de votre impôt (par part fiscale)
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
          <span className="text-slate-500">Revenu / part :</span>
          <strong className="text-[#101827]">{formatFrenchEuros(taxableIncomePerPartEur)}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left 7 cols: Interactive 5-Step Progressive Bars */}
        <div className="lg:col-span-7 space-y-2.5">
          <p className="text-xs text-slate-600">
            Cliquez sur une tranche pour vérifier comment vos{' '}
            <strong className="text-slate-900">{formatFrenchEuros(taxableIncomePerPartEur)} par part</strong>{' '}
            sont découpés sans jamais surtaxer vos premiers euros :
          </p>

          <div className="space-y-2" role="list" aria-label="Tranches du barème progressif">
            {bracketSlices.map((slice) => {
              const isSelected = activeSlice?.ratePercent === slice.ratePercent;
              const isReached = slice.taxableSlicePerPartEur > 0 || slice.ratePercent === 0;
              const widthPct =
                slice.ratePercent === 0
                  ? 100
                  : Math.min(
                      100,
                      Math.max(
                        isReached ? 18 : 6,
                        Math.round((slice.taxableSlicePerPartEur / maxSliceCeiling) * 100)
                      )
                    );

              return (
                <button
                  key={slice.ratePercent}
                  type="button"
                  onClick={() => setSelectedBracketRate(slice.ratePercent)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs'
                      : isReached
                      ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                      : 'bg-white border-slate-100 opacity-65 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                          slice.ratePercent === 0
                            ? 'bg-slate-200 text-slate-800'
                            : isReached
                            ? 'bg-[#10B981] text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {slice.ratePercent} %
                      </span>
                      <span className="font-semibold text-slate-800 text-xs">
                        {slice.label.replace(/^Tranche \d+ % /, '')}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {formatFrenchEuros(slice.taxPerPartEur)} / part
                    </span>
                  </div>

                  {/* Visual progress bar inside the bracket */}
                  <div className="w-full h-2 rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      style={{ width: `${isReached ? widthPct : 0}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        slice.ratePercent === 0
                          ? 'bg-slate-400'
                          : slice.ratePercent === marginalTaxRatePercent
                          ? 'bg-[#10B981]'
                          : 'bg-[#101827]'
                      }`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                    <span>
                      Portion taxée : {formatFrenchEuros(slice.taxableSlicePerPartEur)}
                    </span>
                    <span>
                      Sur {familyQuotientParts} part(s) :{' '}
                      {formatFrenchEuros(Math.round(slice.taxPerPartEur * familyQuotientParts))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 cols: 3D Sculpture Visual + Selected Slice Inspector */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <Image
              src="/assets/visuals/tax-harmony-sculpture.jpg"
              alt="Représentation 3D isométrique des cinq marches du barème progressif de l'impôt français"
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 380px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101827]/80 via-transparent to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                ZOOM SUR LA TRANCHE SÉLECTIONNÉE ({activeSlice.ratePercent} %)
              </p>
              <p className="text-xs font-bold mt-0.5">
                {activeSlice.taxableSlicePerPartEur > 0
                  ? `${formatFrenchEuros(activeSlice.taxableSlicePerPartEur)} taxés à ${activeSlice.ratePercent} % = ${formatFrenchEuros(activeSlice.taxPerPartEur)} / part`
                  : `Votre revenu par part n’atteint pas cette tranche à ${activeSlice.ratePercent} % (0 € d’impôt).`}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-emerald-900 font-semibold">Taux moyen réel : {effectiveRatePercent.toFixed(1)} %</span>
              <span className="text-slate-600">TMI : {marginalTaxRatePercent} %</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Même si votre tranche maximale est de <strong>{marginalTaxRatePercent} %</strong>, vos premiers euros restent toujours taxés à 0 % puis 11 %.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. Custom Visual Diagram: Déduction vs Réduction vs Crédit d'impôt
 * Pure architectural CSS + geometric flow diagram explaining how each legal mechanism acts.
 */
export function TaxMechanismsVisualDiagram() {
  return (
    <div
      aria-label="Schéma comparatif entre déduction, réduction et crédit d'impôt"
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {/* 1. Déduction */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
              1. Déduction du revenu
            </span>
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="text-sm font-bold text-[#101827]">
            Agit avant le barème de l’impôt
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Diminue votre revenu imposable. Plus votre tranche (TMI) est élevée, plus l’économie est forte.
          </p>
        </div>

        {/* Visual bar diagram */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2 text-[11px] font-mono">
          <div className="flex items-center justify-between text-slate-600">
            <span>Revenu déclaré</span>
            <span>100 %</span>
          </div>
          <div className="w-full h-3 rounded bg-slate-200 overflow-hidden flex">
            <div className="w-[78%] bg-[#101827] h-full" title="Base imposable réduite" />
            <div className="w-[22%] bg-emerald-400 h-full" title="Déduction soustraite (-10%, PER, Frais réels)" />
          </div>
          <div className="flex justify-between text-[10px] text-emerald-800 font-semibold">
            <span>Ex : Frais réels, PER, Pension</span>
            <span>Gain = Dépense × TMI</span>
          </div>
        </div>
      </div>

      {/* 2. Réduction d'impôt */}
      <div className="rounded-xl border border-amber-200/90 bg-white p-4 space-y-3 shadow-2xs flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
              2. Réduction d’impôt
            </span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-[#101827]">
            Diminue l’impôt jusqu’à 0 € max
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Soustraite directement de votre impôt brut. Si elle dépasse votre impôt, le surplus n’est pas remboursé.
          </p>
        </div>

        {/* Visual bar diagram */}
        <div className="p-3 rounded-lg bg-amber-50/40 border border-amber-200/80 space-y-2 text-[11px] font-mono">
          <div className="flex items-center justify-between text-amber-950">
            <span>Impôt brut</span>
            <span>Plancher : 0 €</span>
          </div>
          <div className="w-full h-3 rounded bg-amber-100 overflow-hidden flex">
            <div className="w-[45%] bg-[#101827] h-full" />
            <div className="w-[55%] bg-amber-500 h-full" />
          </div>
          <div className="flex justify-between text-[10px] text-amber-900 font-semibold">
            <span>Ex : Dons (66% / 75%), Scolarité</span>
            <span>Non remboursable</span>
          </div>
        </div>
      </div>

      {/* 3. Crédit d'impôt */}
      <div className="rounded-xl border border-emerald-200 bg-white p-4 space-y-3 shadow-2xs flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
              3. Crédit d’impôt
            </span>
            <Sparkles className="w-4 h-4 text-[#10B981]" />
          </div>
          <h3 className="text-sm font-bold text-[#101827]">
            Remboursé par virement DGFiP
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Même si votre impôt est de 0 €, l’administration fiscale vous vire la somme sur votre compte bancaire.
          </p>
        </div>

        {/* Visual bar diagram */}
        <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2 text-[11px] font-mono">
          <div className="flex items-center justify-between text-emerald-950">
            <span>Impôt ramené à 0 €</span>
            <span className="text-emerald-700 font-bold">+ Virement bancaire</span>
          </div>
          <div className="w-full h-3 rounded bg-emerald-100 overflow-hidden flex">
            <div className="w-full bg-[#10B981] h-full" />
          </div>
          <div className="flex justify-between text-[10px] text-emerald-800 font-semibold">
            <span>Ex : Garde &lt; 6 ans, Domicile (50%)</span>
            <span>100 % remboursable</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 4. Editorial Parisian Architecture & Fintech Mockup Showcase
 * Used on About / Marketing sections to combine authentic French architectural heritage
 * with futuristic fintech interface precision.
 */
export function ParisianEditorialShowcase() {
  return (
    <div className="rounded-xl overflow-hidden border border-[#E8EDF2] bg-white shadow-xs grid grid-cols-1 lg:grid-cols-12">
      {/* Left: High-res Parisian architectural editorial image */}
      <div className="lg:col-span-6 relative min-h-[260px] sm:min-h-[320px] bg-slate-100">
        <Image
          src="/assets/visuals/editorial-paris-fintech.jpg"
          alt="Architecture intérieure parisienne haussmannienne baignée de lumière naturelle associée à des parois de verre contemporaines aux reflets émeraude"
          fill
          loading="lazy"
          sizes="(max-width: 1024px) 100vw, 580px"
          referrerPolicy="no-referrer"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101827]/70 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-[10px] font-mono uppercase tracking-wider">
            INGÉNIERIE FISCALE FRANÇAISE · PARIS
          </span>
          <p className="text-sm font-bold">
            Alliance de la rigueur juridique du Code général des impôts et de la clarté numérique
          </p>
        </div>
      </div>

      {/* Right: Interactive Interface Composition & Verification Architecture */}
      <div className="lg:col-span-6 p-6 bg-[#F8FAFC] flex flex-col justify-between space-y-5">
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
            ARCHITECTURE DE VÉRIFICATION EN 3 COUCHES
          </span>
          <h3 className="text-lg font-bold text-[#101827]">
            Pourquoi nos résultats sont toujours auditables
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Contrairement aux assistants génériques qui estiment à l’aveugle, chaque simulation FISCALIQ traverse trois couches de contrôle indépendantes :
          </p>
        </div>

        {/* Stacked Interface Mockup Layers */}
        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-mono font-bold shrink-0">
              01
            </div>
            <div>
              <p className="font-bold text-[#101827]">Registre documentaire officiel (BOFiP / Légifrance)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Seules les sources avec le statut <span className="font-mono text-emerald-700">APPROVED_VERIFIED</span> sont autorisées.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[#101827] font-mono font-bold shrink-0">
              02
            </div>
            <div>
              <p className="font-bold text-[#101827]">Moteur arithmétique déterministe (2026 &amp; 2025)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Calcul exact des parts (Art. 194), de la décote (Art. 197) et du PAS (Art. 204 F).
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-mono font-bold shrink-0">
              03
            </div>
            <div>
              <p className="font-bold text-[#101827]">Traduction pédagogique sans jargon</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Indication systématique de la case exacte du formulaire 2042 / 2042 RICI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
