import { describe, expect, it } from 'vitest';
import type { Suggestion } from './formulaire';
import { formaterSuggestion, SUJET_MAIL } from './message';

const base: Suggestion = {
  profil: "Étudiant(e) de l'UCAO-UUC",
  profilAutre: '',
  stands: ['Mode et tissus wax', 'Autre'],
  standsAutre: "livres d'occasion",
  animations: ['Karaoké', 'Danse et DJ'],
  animationsAutre: '',
  tenirStand: 'Oui',
  idee: 'Organiser un concours du plus beau stand…',
};
// 11/11/2026 11:15 à Cotonou = 10:15 UTC
const date = new Date('2026-11-11T10:15:00Z');

describe('formaterSuggestion', () => {
  it('produit le texte exact du mail', () => {
    expect(formaterSuggestion(base, date)).toBe(
      [
        '🎄 Nouvelle suggestion · Marché de Noël',
        '━━━━━━━━━━━━━━━',
        "👤 Profil : Étudiant(e) de l'UCAO-UUC",
        "🛍️ Stands souhaités : Mode et tissus wax, Autre : livres d'occasion",
        '🎉 Animations : Karaoké, Danse et DJ',
        '🏪 Veut tenir un stand : Oui',
        '',
        '💡 Son idée :',
        'Organiser un concours du plus beau stand…',
        '━━━━━━━━━━━━━━━',
        '🕒 Reçue le 11/11/2026 à 11:15 via la Boîte à idées du BEE',
      ].join('\n'),
    );
  });

  it('place « Autre » à la fin, même coché en premier, et gère le profil Autre', () => {
    const m = formaterSuggestion(
      { ...base, profil: 'Autre', profilAutre: ' Parent ', animations: ['Autre', 'Tombola'], animationsAutre: 'Slam' },
      date,
    );
    expect(m).toContain('👤 Profil : Autre : Parent');
    expect(m).toContain('🎉 Animations : Tombola, Autre : Slam');
  });

  it("garde les retours à la ligne de l'idée", () => {
    expect(formaterSuggestion({ ...base, idee: 'Ligne 1\n\nLigne 2' }, date)).toContain('Ligne 1\n\nLigne 2');
  });
});

describe('SUJET_MAIL', () => {
  it('est toujours le même, pour que Gmail regroupe les suggestions dans une conversation', () => {
    expect(SUJET_MAIL).toBe('Suggestions · Marché de Noël');
  });
});
