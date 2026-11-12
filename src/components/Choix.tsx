'use client';

import { useRef } from 'react';
import { AUTRE } from '@/lib/formulaire';
import { TexteLong } from './TexteLong';

type Type = 'radio' | 'checkbox';

type Commun = {
  nom: string;
  options: readonly string[];
  /** Ajoute l'option « Autre » avec sa zone de texte. */
  avecAutre?: boolean;
  texteAutre?: string;
  erreurAutre?: string;
  changerTexteAutre?: (t: string) => void;
};

/** Une option : ligne entièrement cliquable, zone de toucher d'au moins 44 px. */
function Option({ type, nom, libelle, coche, onChange }: {
  type: Type;
  nom: string;
  libelle: string;
  coche: boolean;
  onChange: (coche: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 py-[7px]">
      <input type={type} name={nom} value={libelle} checked={coche} onChange={(e) => onChange(e.target.checked)} />
      <span>{libelle}</span>
    </label>
  );
}

/** Option « Autre » : case suivie d'une zone de texte qui s'agrandit. */
function OptionAutre({ type, nom, coche, texte, erreur, basculer, changerTexte }: {
  type: Type;
  nom: string;
  coche: boolean;
  texte: string;
  erreur?: string;
  basculer: (coche: boolean) => void;
  changerTexte: (t: string) => void;
}) {
  const champ = useRef<HTMLTextAreaElement>(null);
  const idErreur = `${nom}-autre-erreur`;

  return (
    <div>
      <div className="flex min-h-11 items-start gap-3 py-1">
        <input
          type={type}
          name={nom}
          value={AUTRE}
          aria-label="Autre"
          className="mt-2.5"
          checked={coche}
          onChange={(e) => {
            basculer(e.target.checked);
            if (e.target.checked) champ.current?.focus(); // place le curseur dans la zone
          }}
        />
        <TexteLong
          ref={champ}
          hauteurMin={38}
          value={texte}
          placeholder="Autre : précisez"
          aria-label="Autre : précisez"
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? idErreur : undefined}
          onChange={(e) => {
            changerTexte(e.target.value);
            if (e.target.value.trim() && !coche) basculer(true); // écrire coche automatiquement
          }}
        />
      </div>
      <p id={idErreur} aria-live="polite" className="m-0 ml-[30px] text-[13px] leading-normal text-rouge empty:hidden [&:not(:empty)]:mt-1">
        {erreur ?? ''}
      </p>
    </div>
  );
}

export function ChoixUnique({
  nom,
  options,
  valeur,
  changer,
  avecAutre,
  texteAutre = '',
  erreurAutre,
  changerTexteAutre,
}: Commun & { valeur: string; changer: (v: string) => void }) {
  return (
    <div role="radiogroup">
      {options.map((o) => (
        <Option key={o} type="radio" nom={nom} libelle={o} coche={valeur === o} onChange={() => changer(o)} />
      ))}
      {avecAutre ? (
        <OptionAutre
          type="radio"
          nom={nom}
          coche={valeur === AUTRE}
          texte={texteAutre}
          erreur={erreurAutre}
          basculer={() => changer(AUTRE)}
          changerTexte={(t) => changerTexteAutre?.(t)}
        />
      ) : null}
    </div>
  );
}

export function ChoixMultiples({
  nom,
  options,
  valeurs,
  changer,
  avecAutre,
  texteAutre = '',
  erreurAutre,
  changerTexteAutre,
}: Commun & { valeurs: string[]; changer: (v: string[]) => void }) {
  const basculer = (o: string, coche: boolean) =>
    changer(coche ? [...valeurs.filter((v) => v !== o), o] : valeurs.filter((v) => v !== o));

  return (
    <div>
      {options.map((o) => (
        <Option
          key={o}
          type="checkbox"
          nom={nom}
          libelle={o}
          coche={valeurs.includes(o)}
          onChange={(c) => basculer(o, c)}
        />
      ))}
      {avecAutre ? (
        <OptionAutre
          type="checkbox"
          nom={nom}
          coche={valeurs.includes(AUTRE)}
          texte={texteAutre}
          erreur={erreurAutre}
          basculer={(c) => basculer(AUTRE, c)}
          changerTexte={(t) => changerTexteAutre?.(t)}
        />
      ) : null}
    </div>
  );
}
