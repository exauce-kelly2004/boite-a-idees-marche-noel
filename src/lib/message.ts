import { AUTRE, type Suggestion } from './formulaire';

const LIGNE = '━━━━━━━━━━━━━━━';

/** Remplace « Autre » par « Autre : <texte> », placé à la suite des choix cochés. */
function avecAutre(choix: readonly string[], autre: string): string {
  const coches = choix.filter((c) => c !== AUTRE);
  if (choix.includes(AUTRE)) coches.push(`${AUTRE} : ${autre.trim()}`);
  return coches.join(', ');
}

/** Date et heure du Bénin, au format « 11/11/2026 à 11:15 ». */
export function dateBenin(date: Date): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const p = (t: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === t)?.value ?? '';
  return `${p('day')}/${p('month')}/${p('year')} à ${p('hour')}:${p('minute')}`;
}

/** Les réponses, prêtes à afficher (« Autre » déjà remplacé par « Autre : <texte> »). */
export type ChampsMessage = {
  profil: string;
  stands: string;
  animations: string;
  tenirStand: string;
  idee: string;
  recueLe: string;
};

export function champsMessage(d: Suggestion, date: Date): ChampsMessage {
  return {
    profil: d.profil === AUTRE ? `${AUTRE} : ${d.profilAutre.trim()}` : d.profil,
    stands: avecAutre(d.stands, d.standsAutre),
    animations: avecAutre(d.animations, d.animationsAutre),
    tenirStand: d.tenirStand,
    idee: d.idee.trim(),
    recueLe: dateBenin(date),
  };
}

/**
 * Objet du mail, toujours identique : Gmail range ainsi toutes les suggestions
 * dans une seule et même conversation (la date est dans le texte du mail).
 */
export const SUJET_MAIL = 'Suggestions · Marché de Noël';

/** Texte du mail (texte brut). Fonction pure. */
export function formaterSuggestion(d: Suggestion, date: Date): string {
  const c = champsMessage(d, date);
  return [
    '🎄 Nouvelle suggestion · Marché de Noël',
    LIGNE,
    `👤 Profil : ${c.profil}`,
    `🛍️ Stands souhaités : ${c.stands}`,
    `🎉 Animations : ${c.animations}`,
    `🏪 Veut tenir un stand : ${c.tenirStand}`,
    '',
    '💡 Son idée :',
    c.idee,
    LIGNE,
    `🕒 Reçue le ${c.recueLe} via la Boîte à idées du BEE`,
  ].join('\n');
}
