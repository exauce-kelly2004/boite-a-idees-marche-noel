import { forwardRef } from 'react';

/** Carte de confirmation après l'envoi. */
export const EcranMerci = forwardRef<HTMLElement, { recommencer: () => void }>(function EcranMerci(
  { recommencer },
  ref,
) {
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-live="polite"
      className="mt-3 rounded-xl border border-t-[6px] border-trait border-t-rouge px-5 py-[22px] text-center outline-none"
    >
      <h2 className="m-0 mb-1.5 text-xl font-semibold">Merci pour votre idée !</h2>
      <p className="m-0 text-texte">
        Le BEE lit toutes les suggestions. Rendez-vous du 16 au 18 décembre au siège de l&apos;UCAO-UUC.
      </p>
      <button
        type="button"
        onClick={recommencer}
        className="mt-4 min-h-11 cursor-pointer border-0 bg-transparent font-sans text-[13px] text-rouge underline"
      >
        Envoyer une autre suggestion
      </button>
    </section>
  );
});
