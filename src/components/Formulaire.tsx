'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ANIMATIONS,
  BROUILLON_VIDE,
  ORDRE_CHAMPS,
  PROFILS,
  STANDS,
  TENIR_STAND,
  valider,
  type Brouillon,
  type Champ,
  type Erreurs,
} from '@/lib/formulaire';
import { BoutonEnvoyer } from './BoutonEnvoyer';
import { CarteQuestion } from './CarteQuestion';
import { ChoixMultiples, ChoixUnique } from './Choix';
import { EcranMerci } from './EcranMerci';
import { TexteLong } from './TexteLong';

const API = '/api/suggestions';
const MESSAGE_ECHEC = "L'envoi n'a pas abouti. Vérifiez votre connexion et réessayez.";

/** Carte qui contient chaque champ (pour défiler jusqu'à la première erreur). */
const CARTE_DU_CHAMP: Record<Champ, number> = {
  profil: 0,
  profilAutre: 0,
  stands: 1,
  standsAutre: 1,
  animations: 2,
  animationsAutre: 2,
  tenirStand: 3,
  idee: 4,
};

/** Demande au serveur un jeton signé (anti-robot). */
async function demanderJeton(): Promise<string | null> {
  try {
    const rep = await fetch(API, { method: 'GET', cache: 'no-store' });
    const corps = (await rep.json()) as { jeton?: unknown };
    return typeof corps.jeton === 'string' ? corps.jeton : null;
  } catch {
    return null;
  }
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Formulaire() {
  const [b, setB] = useState<Brouillon>(BROUILLON_VIDE);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const [merci, setMerci] = useState(false);
  const [piege, setPiege] = useState(''); // champ piège anti-robots, invisible

  const jeton = useRef<Promise<string | null>>(Promise.resolve(null));
  const enCours = useRef(false); // empêche un double envoi (double clic rapide)
  const cartes = useRef<(HTMLElement | null)[]>([]);
  const carteMerci = useRef<HTMLElement>(null);

  // Le jeton est demandé dès l'affichage du formulaire.
  useEffect(() => {
    jeton.current = demanderJeton();
  }, []);

  useEffect(() => {
    if (merci) {
      carteMerci.current?.focus();
      carteMerci.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [merci]);

  /** Met à jour un champ et efface les erreurs de la question concernée. */
  function maj<K extends keyof Brouillon>(champ: K, valeur: Brouillon[K]) {
    setB((prec) => ({ ...prec, [champ]: valeur }));
    setErreurs((prec) => {
      const suite = { ...prec };
      for (const c of ORDRE_CHAMPS) if (CARTE_DU_CHAMP[c] === CARTE_DU_CHAMP[champ]) delete suite[c];
      return suite;
    });
  }

  function effacer() {
    setB(BROUILLON_VIDE);
    setErreurs({});
    setEchec(null);
  }

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (enCours.current) return;
    setEchec(null);

    const r = valider(b);
    if (!r.ok) {
      setErreurs(r.erreurs);
      const premier = ORDRE_CHAMPS.find((c) => r.erreurs[c]);
      const carte = premier ? cartes.current[CARTE_DU_CHAMP[premier]] : null;
      carte?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      carte?.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true });
      return;
    }

    enCours.current = true;
    setEnvoi(true);
    try {
      const poster = async (j: string) => {
        // Le serveur exige 3 s entre l'affichage et l'envoi : on patiente si besoin.
        const age = Date.now() - Number(j.split('.')[0]);
        if (age < 3200) await attendre(3200 - age);
        const rep = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reponses: r.donnees, jeton: j, site: piege }),
        });
        const corps = (await rep.json().catch(() => ({}))) as { ok?: boolean; erreur?: string };
        return { rep, corps };
      };

      let j = await jeton.current;
      if (!j) j = await (jeton.current = demanderJeton());
      if (!j) {
        setEchec(MESSAGE_ECHEC);
        return;
      }
      let { rep, corps } = await poster(j);
      if (rep.status === 403) {
        // Jeton expiré (page ouverte depuis longtemps) : on en reprend un et on réessaie une fois.
        j = await (jeton.current = demanderJeton());
        if (j) ({ rep, corps } = await poster(j));
      }
      if (!rep.ok || !corps.ok) {
        setEchec(rep.status === 429 && corps.erreur ? corps.erreur : MESSAGE_ECHEC);
        return;
      }
      setMerci(true);
    } catch {
      setEchec(MESSAGE_ECHEC);
    } finally {
      enCours.current = false;
      setEnvoi(false);
    }
  }

  function recommencer() {
    effacer();
    jeton.current = demanderJeton();
    setMerci(false);
  }

  if (merci) return <EcranMerci ref={carteMerci} recommencer={recommencer} />;

  return (
    <>
      <section className="mt-3 rounded-xl border border-t-[6px] border-trait border-t-rouge px-5 py-[22px]">
        <h1 className="m-0 mb-2 text-[22px] leading-[1.3] font-semibold tracking-[-0.01em]">
          Boîte à idées · Marché de Noël
        </h1>
        <p className="m-0 text-texte">
          Le Marché de Noël de l&apos;UCAO-UUC aura lieu du 16 au 18 décembre, au siège de Saint-Jean. Ce formulaire
          sert à recueillir vos idées pour bien le préparer. Répondre prend 2 minutes et reste anonyme.
        </p>
        <p className="m-0 mt-3.5 text-[13px] text-rouge">* Indique une question obligatoire</p>
      </section>

      <form onSubmit={envoyer} noValidate>
        <CarteQuestion id="q-profil" question="Vous êtes" erreur={erreurs.profil} ref={(el) => { cartes.current[0] = el; }}>
          <ChoixUnique
            nom="profil"
            options={PROFILS}
            valeur={b.profil}
            changer={(v) => maj('profil', v)}
            avecAutre
            texteAutre={b.profilAutre}
            erreurAutre={erreurs.profilAutre}
            changerTexteAutre={(t) => maj('profilAutre', t)}
          />
        </CarteQuestion>

        <CarteQuestion
          id="q-stands"
          question="Quels stands aimeriez-vous trouver ?"
          aide="Plusieurs réponses possibles"
          erreur={erreurs.stands}
          ref={(el) => { cartes.current[1] = el; }}
        >
          <ChoixMultiples
            nom="stands"
            options={STANDS}
            valeurs={b.stands}
            changer={(v) => maj('stands', v)}
            avecAutre
            texteAutre={b.standsAutre}
            erreurAutre={erreurs.standsAutre}
            changerTexteAutre={(t) => maj('standsAutre', t)}
          />
        </CarteQuestion>

        <CarteQuestion
          id="q-animations"
          question="Quelles animations vous feraient venir ?"
          aide="Plusieurs réponses possibles"
          erreur={erreurs.animations}
          ref={(el) => { cartes.current[2] = el; }}
        >
          <ChoixMultiples
            nom="animations"
            options={ANIMATIONS}
            valeurs={b.animations}
            changer={(v) => maj('animations', v)}
            avecAutre
            texteAutre={b.animationsAutre}
            erreurAutre={erreurs.animationsAutre}
            changerTexteAutre={(t) => maj('animationsAutre', t)}
          />
        </CarteQuestion>

        <CarteQuestion
          id="q-stand"
          question="Aimeriez-vous tenir un stand ?"
          erreur={erreurs.tenirStand}
          ref={(el) => { cartes.current[3] = el; }}
        >
          <ChoixUnique nom="tenirStand" options={TENIR_STAND} valeur={b.tenirStand} changer={(v) => maj('tenirStand', v)} />
        </CarteQuestion>

        <CarteQuestion
          id="q-idee"
          question="Votre idée pour un Marché de Noël réussi"
          aide="Écrivez librement, sans limite de longueur."
          erreur={erreurs.idee}
          ref={(el) => { cartes.current[4] = el; }}
        >
          <TexteLong
            name="idee"
            value={b.idee}
            onChange={(e) => maj('idee', e.target.value)}
            placeholder="Votre réponse"
            aria-label="Votre idée pour un Marché de Noël réussi"
            aria-required="true"
            aria-invalid={erreurs.idee ? true : undefined}
          />
        </CarteQuestion>

        {/* Champ piège : invisible pour les humains, rempli par les robots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Site web
            <input type="text" name="site" tabIndex={-1} autoComplete="off" value={piege} onChange={(e) => setPiege(e.target.value)} />
          </label>
        </div>

        <p role="alert" className="m-0 text-[13px] leading-normal text-rouge empty:hidden [&:not(:empty)]:mt-4">
          {echec ?? ''}
        </p>

        <div className="mt-5 flex items-center justify-between gap-4">
          <BoutonEnvoyer envoi={envoi} />
          <button
            type="button"
            onClick={effacer}
            className="min-h-11 cursor-pointer border-0 bg-transparent font-sans text-sm font-medium text-rouge"
          >
            Effacer le formulaire
          </button>
        </div>
      </form>
    </>
  );
}
