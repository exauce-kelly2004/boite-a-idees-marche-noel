import { describe, expect, it } from 'vitest';
import { BROUILLON_VIDE, valider, type Brouillon } from './formulaire';

const complet: Brouillon = {
  profil: "Étudiant(e) de l'UCAO-UUC",
  profilAutre: '',
  stands: ['Bijoux et accessoires'],
  standsAutre: '',
  animations: ['Tombola'],
  animationsAutre: '',
  tenirStand: 'Non',
  idee: 'Plus de musique',
};

describe('schéma de la suggestion', () => {
  it('accepte un formulaire complet', () => {
    expect(valider(complet).ok).toBe(true);
  });

  it('exige toutes les questions', () => {
    const r = valider(BROUILLON_VIDE);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.erreurs).sort()).toEqual(['animations', 'idee', 'profil', 'stands', 'tenirStand']);
      expect(r.erreurs.profil).toBe('Cette question est obligatoire.');
    }
  });

  it("refuse une idée faite uniquement d'espaces", () => {
    expect(valider({ ...complet, idee: '   ' }).ok).toBe(false);
  });

  it('exige le texte quand « Autre » est coché', () => {
    const r = valider({ ...complet, stands: ['Autre'], standsAutre: ' ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.standsAutre).toBe('Précisez votre réponse.');
  });

  it('refuse une option inconnue et un texte de plus de 5 000 caractères', () => {
    expect(valider({ ...complet, tenirStand: 'Jamais' }).ok).toBe(false);
    expect(valider({ ...complet, idee: 'a'.repeat(5001) }).ok).toBe(false);
  });
});
