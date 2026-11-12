'use client';

import React, { useState } from 'react';
import { PublicShell } from '@/components/layout/public-shell';
import { personalContactFormSchema } from '@/lib/validation/schemas';
import { Check, Send, Mail } from 'lucide-react';

export default function ContactPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [householdSituation, setHouseholdSituation] = useState<
    | 'salarie_celibataire'
    | 'couple_famille'
    | 'parent_isole'
    | 'retraite_bailleur'
    | 'independant_etudiant'
  >('couple_famille');
  const [topic, setTopic] = useState<
    | 'question_simulateur_ir'
    | 'credits_reductions_impot'
    | 'prelevement_source_salaire'
    | 'confidentialite_rgpd'
  >('question_simulateur_ir');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = personalContactFormSchema.safeParse({
      fullName: fullName.trim(),
      email: email.trim(),
      householdSituation,
      topic,
      message: message.trim(),
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message || 'Vérifiez les champs.');
      return;
    }

    setSubmittedTicket(`FIQ-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  return (
    <PublicShell>
      <div className="gw-view-heading">
        <div>
          <p className="gw-greeting">Support utilisateurs</p>
          <h1>Contact</h1>
        </div>
        <div className="gw-heading-action">
          <span className="gw-date">
            <Mail size={14} /> bonjour@fiscaliq.fr
          </span>
        </div>
      </div>

      <section className="gw-panel max-w-2xl">
        {submittedTicket ? (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#326b54]">
              <Check size={16} />
              <span>Message envoyé · Réf. {submittedTicket}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmittedTicket(null);
                setMessage('');
              }}
              className="gw-button"
            >
              Nouveau message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-3 text-xs">
            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-amber-100/80 text-amber-950 font-medium">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Nom</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Camille Moreau"
                  className="w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille@exemple.fr"
                  className="w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Situation</label>
                <select
                  value={householdSituation}
                  onChange={(e) =>
                    setHouseholdSituation(
                      e.target.value as
                        | 'salarie_celibataire'
                        | 'couple_famille'
                        | 'parent_isole'
                        | 'retraite_bailleur'
                        | 'independant_etudiant'
                    )
                  }
                  className="w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2"
                >
                  <option value="salarie_celibataire">Célibataire</option>
                  <option value="couple_famille">Couple / Famille</option>
                  <option value="parent_isole">Parent isolé</option>
                  <option value="retraite_bailleur">Retraité / Bailleur</option>
                  <option value="independant_etudiant">Indépendant / Étudiant</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Sujet</label>
                <select
                  value={topic}
                  onChange={(e) =>
                    setTopic(
                      e.target.value as
                        | 'question_simulateur_ir'
                        | 'credits_reductions_impot'
                        | 'prelevement_source_salaire'
                        | 'confidentialite_rgpd'
                    )
                  }
                  className="w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2"
                >
                  <option value="question_simulateur_ir">Calcul d’impôt 2026</option>
                  <option value="credits_reductions_impot">Crédits &amp; réductions</option>
                  <option value="prelevement_source_salaire">Salaire &amp; PAS</option>
                  <option value="confidentialite_rgpd">Abonnement (0 € / 5 €) &amp; RGPD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Message</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre question..."
                className="w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2"
              />
            </div>

            <button type="submit" className="gw-button">
              <Send size={13} />
              <span>Envoyer</span>
            </button>
          </form>
        )}
      </section>
    </PublicShell>
  );
}
