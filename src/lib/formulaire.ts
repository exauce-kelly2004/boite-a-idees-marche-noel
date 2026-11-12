import { z } from 'zod';

/** Textes exacts du formulaire (DESIGN_SYSTEM.md, section 6). */
export const PROFILS = [
  "Étudiant(e) de l'UCAO-UUC",
  "Étudiant(e) d'un autre établissement",
  'Enseignant(e) ou membre du personnel',
] as const;

export const STANDS = [
  'Mode et tissus wax',
  'Bijoux et accessoires',
  'Beauté et cosmétiques',
  'Restauration et boissons',
  'Artisanat et idées cadeaux',
] as const;

export const ANIMATIONS = [
  'Tombola',
  'Karaoké',
  'Danse et DJ',
  'Jeux et concours',
  'Défilé de mode',
] as const;

export const TENIR_STAND = ['Oui', 'Peut-être', 'Non'] as const;

/** Valeur interne de l'option « Autre ». */
export const AUTRE = 'Autre';

/** Limite de sécurité côté serveur (aucune limite affichée côté interface). */
export const LIMITE_TEXTE = 5000;

const OBLIGATOIRE = 'Cette question est obligatoire.';
const PRECISEZ = 'Précisez votre réponse.';

/**
 * Retire ce qui peut servir à tromper le lecteur du message WhatsApp :
 * caractères de contrôle, inversions de sens d'écriture (U+202A–202E, U+2066–2069),
 * caractères invisibles, et le trait de séparation du message.
 */
export function nettoyer(texte: string): string {
  return texte
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g, '')
    .replace(/━+/g, '-')
    .trim();
}

/** Texte libre multiligne (« Votre idée »). */
const texteLibre = z.string().max(LIMITE_TEXTE, 'Texte trop long.').transform(nettoyer);
/** Précision « Autre » : une seule ligne, pour qu'on ne puisse pas imiter une autre rubrique. */
const texteAutre = z
  .string()
  .max(LIMITE_TEXTE, 'Texte trop long.')
  .transform((t) => nettoyer(t).replace(/\s+/g, ' '))
  .default('');

/** Choix multiples : jamais plus d'éléments que d'options, sans doublon. */
const choixMultiples = <T extends readonly [string, ...string[]]>(options: T) =>
  z
    .array(z.enum(options))
    .max(options.length)
    .min(1, OBLIGATOIRE)
    .refine((l) => new Set(l).size === l.length, 'Réponse en double.');

export const schemaSuggestion = z
  .object({
    profil: z.enum([...PROFILS, AUTRE], { error: OBLIGATOIRE }),
    profilAutre: texteAutre,
    stands: choixMultiples([...STANDS, AUTRE]),
    standsAutre: texteAutre,
    animations: choixMultiples([...ANIMATIONS, AUTRE]),
    animationsAutre: texteAutre,
    tenirStand: z.enum(TENIR_STAND, { error: OBLIGATOIRE }),
    idee: texteLibre.refine((t) => t.length > 0, OBLIGATOIRE),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.profil === AUTRE && !d.profilAutre)
      ctx.addIssue({ code: 'custom', path: ['profilAutre'], message: PRECISEZ });
    if (d.stands.includes(AUTRE) && !d.standsAutre)
      ctx.addIssue({ code: 'custom', path: ['standsAutre'], message: PRECISEZ });
    if (d.animations.includes(AUTRE) && !d.animationsAutre)
      ctx.addIssue({ code: 'custom', path: ['animationsAutre'], message: PRECISEZ });
  });

export type Suggestion = z.infer<typeof schemaSuggestion>;

/** État du formulaire côté appli (avant validation). */
export type Brouillon = {
  profil: string;
  profilAutre: string;
  stands: string[];
  standsAutre: string;
  animations: string[];
  animationsAutre: string;
  tenirStand: string;
  idee: string;
};

export const BROUILLON_VIDE: Brouillon = {
  profil: '',
  profilAutre: '',
  stands: [],
  standsAutre: '',
  animations: [],
  animationsAutre: '',
  tenirStand: '',
  idee: '',
};

/** Champs dans l'ordre d'affichage : sert à défiler jusqu'à la première erreur. */
export const ORDRE_CHAMPS = [
  'profil',
  'profilAutre',
  'stands',
  'standsAutre',
  'animations',
  'animationsAutre',
  'tenirStand',
  'idee',
] as const;

export type Champ = (typeof ORDRE_CHAMPS)[number];
export type Erreurs = Partial<Record<Champ, string>>;

export function valider(b: Brouillon): { ok: true; donnees: Suggestion } | { ok: false; erreurs: Erreurs } {
  const r = schemaSuggestion.safeParse(b);
  if (r.success) return { ok: true, donnees: r.data };
  const erreurs: Erreurs = {};
  for (const issue of r.error.issues) {
    const champ = issue.path[0] as Champ;
    if (!erreurs[champ]) erreurs[champ] = issue.message;
  }
  return { ok: false, erreurs };
}
