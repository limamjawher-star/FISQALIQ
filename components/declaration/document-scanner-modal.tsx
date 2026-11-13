'use client';

import React, { useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { ScannedFiscalDocumentResult } from '@/lib/ai/document-scanner';

export interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedValues: (result: ScannedFiscalDocumentResult) => void;
}

const SAMPLE_TAX_NOTICE_TEXT = `AVIS D'IMPÔT 2026 — IMPÔT SUR LES REVENUS DE L'ANNÉE 2025
Numéro fiscal : 12 34 567 890 123 (masqué automatiquement)
Nombre de parts : 2
Salaires nets imposables (case 1AJ) : 46 800 €
Retenue à la source déjà prélevée en 2025 : 2 640 €
Taux de prélèvement à la source personnalisé : 5,6 %
Plafond épargne retraite disponible pour les cotisations versées (case 6NS) : 4 680 €`;

export function DocumentScannerModal({
  isOpen,
  onClose,
  onApplyExtractedValues,
}: DocumentScannerModalProps) {
  const [documentText, setDocumentText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScannedFiscalDocumentResult | null>(
    null
  );

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('Le fichier dépasse la taille maximale de 4 Mo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageBase64(reader.result);
        setImageMimeType(file.type || 'image/png');
        setImageFileName(file.name);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (textToAnalyze?: string) => {
    const targetText = textToAnalyze ?? documentText;
    if (!targetText.trim() && !imageBase64) {
      setError(
        'Collez le texte de votre avis d’impôt / fiche de paie ou sélectionnez une image.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/scan-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: targetText,
          imageBase64: imageBase64 || undefined,
          mimeType: imageMimeType,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: ScannedFiscalDocumentResult;
      };

      if (!res.ok || !data.ok || !data.result) {
        setError(data.error || 'Impossible d’extraire les montants de ce document.');
        return;
      }

      if (data.result.extractedFieldsSummaryFr.length === 0) {
        setError(
          'Aucun montant fiscal reconnu (ex. case 1AJ, salaire brut, taux PAS ou plafond PER).'
        );
        return;
      }

      setScanResult(data.result);
    } catch {
      setError('Erreur réseau lors de l’analyse du document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner mon avis d’impôt ou ma fiche de paie"
    >
      <div className="gw-panel w-full max-w-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="gw-goal-icon">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#242b27]">
                Remplissage automatique (Avis d’impôt / Fiche de paie)
              </h2>
              <p className="text-xs text-[#384238]">
                Extrait vos cases 1AJ, 6NS (plafond PER) et prélèvement à la source en 5 secondes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre d'import"
            className="gw-popover-close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-[11px] text-[#384238]">
          <ShieldCheck size={15} className="text-[#326b54] shrink-0" />
          <span>
            Protection RGPD : les numéros fiscaux (SPI), numéros de sécurité sociale (NIR) et IBAN sont masqués automatiquement et ne sont jamais stockés.
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="scanner-textarea"
              className="text-xs font-semibold text-[#242b27]"
            >
              Collez le texte de votre avis d’impôt ou bulletin de décembre :
            </label>
            <button
              type="button"
              onClick={() => {
                setDocumentText(SAMPLE_TAX_NOTICE_TEXT);
                handleAnalyze(SAMPLE_TAX_NOTICE_TEXT);
              }}
              className="text-xs font-semibold text-[#326b54] underline hover:opacity-80"
            >
              Tester avec un exemple d’avis d’impôt
            </button>
          </div>

          <textarea
            id="scanner-textarea"
            rows={4}
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Ex : Salaires nets imposables (case 1AJ) : 42 500 € · Retenue à la source : 2 100 € · Plafond épargne retraite : 4 250 €..."
            className="w-full rounded-xl border border-black/15 bg-white/85 p-3 font-mono text-xs text-[#242b27]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-white/80 px-3 py-2 text-xs font-semibold text-[#242b27] hover:bg-white">
              <Upload size={14} className="text-[#326b54]" />
              <span>
                {imageFileName
                  ? `Fichier joint : ${imageFileName}`
                  : 'Ou importer une photo / capture (PNG, JPG)'}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleAnalyze()}
              className="gw-button"
            >
              <FileText size={14} />
              <span>{loading ? 'Extraction en cours...' : 'Extraire mes montants'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50/90 p-3 text-xs text-rose-900">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {scanResult && (
          <div className="rounded-xl border border-[#326b54]/30 bg-[#dce9da]/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#242b27] flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[#326b54]" />
                Montants détectés ({scanResult.documentTypeDetected === 'AVIS_IMPOT' ? 'Avis d’impôt' : scanResult.documentTypeDetected === 'FICHE_DE_PAIE' ? 'Fiche de paie' : 'Document fiscal'})
              </span>
              {scanResult.redactedPiiCount > 0 && (
                <span className="text-[11px] font-medium text-[#326b54]">
                  {scanResult.redactedPiiCount} identifiant(s) personnel(s) masqué(s)
                </span>
              )}
            </div>

            <ul className="space-y-1 text-xs font-mono text-[#242b27]">
              {scanResult.extractedFieldsSummaryFr.map((line, idx) => (
                <li key={idx}>• {line}</li>
              ))}
            </ul>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onApplyExtractedValues(scanResult);
                  onClose();
                }}
                className="gw-button"
              >
                <CheckCircle2 size={14} />
                <span>Appliquer ces montants à ma déclaration</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
