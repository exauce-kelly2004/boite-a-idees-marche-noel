import { forwardRef, type ReactNode } from 'react';

type Props = {
  id: string;
  question: string;
  aide?: string;
  erreur?: string;
  children: ReactNode;
};

/** Carte d'une question obligatoire : libellé + astérisque rouge, aide, erreur. */
export const CarteQuestion = forwardRef<HTMLElement, Props>(function CarteQuestion(
  { id, question, aide, erreur, children },
  ref,
) {
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = `${id}-erreur`;
  const decrit = [idAide, erreur ? idErreur : null].filter(Boolean).join(' ') || undefined;

  return (
    <section
      ref={ref}
      className={`mt-3 rounded-xl border bg-fond px-5 py-[22px] ${erreur ? 'border-rouge' : 'border-trait'}`}
    >
      <fieldset
        className="m-0 min-w-0 border-0 p-0"
        aria-required="true"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decrit}
      >
        <legend className="p-0 text-[15px] leading-[1.55] font-medium">
          {question} <span className="text-rouge" aria-hidden="true">*</span>
        </legend>
        {aide ? (
          <p id={idAide} className="m-0 mt-0.5 text-[13px] leading-normal text-gris">
            {aide}
          </p>
        ) : null}
        <div className="mt-3.5">{children}</div>
      </fieldset>
      <p id={idErreur} aria-live="polite" className="m-0 text-[13px] leading-normal text-rouge empty:hidden [&:not(:empty)]:mt-2">
        {erreur ?? ''}
      </p>
    </section>
  );
});
