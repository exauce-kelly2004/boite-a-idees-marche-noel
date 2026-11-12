import nodemailer from 'nodemailer';

type Env = Record<string, string | undefined>;

/** Une adresse simple, sans espace ni retour à la ligne (impossible d'y glisser un faux en-tête de mail). */
const FORMAT_ADRESSE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$/;

/** Identifiant fixe du fil de discussion qui regroupe toutes les suggestions. */
const FIL = '<suggestions-marche-de-noel@boite-a-idees.local>';

export type ConfigMail = { destinataire: string; compte: string; motDePasse: string };

/**
 * Lit la configuration du mail, uniquement côté serveur (variables d'environnement).
 * - MAIL_DESTINATAIRE : la boîte qui reçoit les suggestions ;
 * - GMAIL_COMPTE : le compte Gmail qui expédie (par défaut : le destinataire lui-même) ;
 * - GMAIL_MOT_DE_PASSE_APPLI : le « mot de passe d'application » de ce compte (16 lettres).
 */
export function lireConfigMail(env: Env = process.env): ConfigMail {
  const destinataire = (env.MAIL_DESTINATAIRE ?? '').trim();
  const compte = (env.GMAIL_COMPTE ?? '').trim() || destinataire;
  // Google affiche le mot de passe en 4 blocs séparés par des espaces : on les retire.
  const motDePasse = (env.GMAIL_MOT_DE_PASSE_APPLI ?? '').replace(/\s+/g, '');

  if (!FORMAT_ADRESSE.test(destinataire)) throw new Error('MAIL_DESTINATAIRE est vide ou mal écrit.');
  if (!FORMAT_ADRESSE.test(compte)) throw new Error('GMAIL_COMPTE est mal écrit.');
  if (motDePasse.length < 16) throw new Error('GMAIL_MOT_DE_PASSE_APPLI est vide ou incomplet (16 lettres).');
  return { destinataire, compte, motDePasse };
}

/** Envoie un mail en texte brut (aucun HTML : rien de ce qu'écrit le visiteur ne peut s'exécuter). */
export async function envoyerMail(config: ConfigMail, sujet: string, texte: string): Promise<void> {
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // connexion chiffrée de bout en bout jusqu'à Gmail
    auth: { user: config.compte, pass: config.motDePasse },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  try {
    await transport.sendMail({
      from: { name: 'Boîte à idées · Marché de Noël', address: config.compte },
      to: config.destinataire,
      subject: sujet,
      text: texte,
      // Chaque mail se présente comme la suite d'un même fil : Gmail les garde dans une seule conversation.
      inReplyTo: FIL,
      references: FIL,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } finally {
    transport.close();
  }
}
