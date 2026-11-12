/** Bouton rouge « Envoyer », inactif et affichant « Envoi… » pendant l'envoi. */
export function BoutonEnvoyer({ envoi }: { envoi: boolean }) {
  return (
    <button
      type="submit"
      disabled={envoi}
      aria-busy={envoi}
      className="min-h-11 cursor-pointer rounded-md border-0 bg-rouge px-[26px] py-2.5 font-sans text-[15px] leading-none font-medium text-white hover:bg-rouge-survol active:bg-rouge-survol disabled:cursor-wait disabled:opacity-70"
    >
      {envoi ? 'Envoi…' : 'Envoyer'}
    </button>
  );
}
