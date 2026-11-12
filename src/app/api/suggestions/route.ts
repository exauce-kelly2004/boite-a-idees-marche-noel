import { schemaSuggestion } from '@/lib/formulaire';
import { creerJeton, creerRegistreJetons, verifierJeton } from '@/lib/jeton';
import { adresseIp, creerLimiteur } from '@/lib/limite';
import { envoyerMail, lireConfigMail } from '@/lib/mail';
import { formaterSuggestion, SUJET_MAIL } from '@/lib/message';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Taille maximale d'une requête : 4 champs de 5 000 caractères tiennent largement dedans. */
const TAILLE_MAX_OCTETS = 64 * 1024;

const HEURE = 60 * 60 * 1000;
// 20 envois / heure / IP : assez large pour un campus où tout le monde partage le même Wi-Fi.
const parIp = creerLimiteur(20, HEURE);
// Garde-fous pour la boîte mail : 200 mails / heure et 450 / jour (Gmail en accepte 500 par jour).
const parHeure = creerLimiteur(200, HEURE);
const parJour = creerLimiteur(450, 24 * HEURE);
// Demandes de jeton : 120 / heure / IP.
const jetonsParIp = creerLimiteur(120, HEURE);
const dejaUtilise = creerRegistreJetons();

const json = (corps: unknown, status = 200) =>
  Response.json(corps, { status, headers: { 'Cache-Control': 'no-store' } });

const NON_CONFIGURE = "Le service n'est pas configuré.";
const TROP = 'Trop de suggestions envoyées. Réessayez dans une heure.';

/** Secret de signature des jetons. Obligatoire : sans lui, aucun envoi n'est accepté. */
function secret(): string | null {
  const s = process.env.JETON_SECRET ?? '';
  if (s.length >= 32) return s;
  console.error('[suggestions] JETON_SECRET absent ou trop court (32 caractères minimum).');
  return null;
}

/** GET : fournit un jeton signé au formulaire, au moment où il s'affiche. */
export async function GET(request: Request): Promise<Response> {
  const s = secret();
  if (!s) return json({ ok: false, erreur: NON_CONFIGURE }, 500);
  if (!jetonsParIp(adresseIp(request.headers))) return json({ ok: false, erreur: TROP }, 429);
  return json({ ok: true, jeton: await creerJeton(s) });
}

/** Lit le corps JSON en refusant les requêtes trop grosses, même sans Content-Length. */
async function lireCorps(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get('content-length') ?? 0) > TAILLE_MAX_OCTETS || !request.body) return null;
  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > TAILLE_MAX_OCTETS) {
      await lecteur.cancel().catch(() => {});
      return null;
    }
    morceaux.push(value);
  }
  try {
    const v: unknown = JSON.parse(Buffer.concat(morceaux).toString('utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  // Un formulaire HTML d'un autre site ne peut pas envoyer de JSON : on l'exige.
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json({ ok: false, erreur: 'Requête invalide.' }, 415);
  }
  // Le navigateur indique d'où part la requête : on refuse celles lancées depuis un autre site.
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ ok: false, erreur: 'Requête invalide.' }, 403);
  }

  const s = secret();
  if (!s) return json({ ok: false, erreur: NON_CONFIGURE }, 500);

  const corps = await lireCorps(request);
  if (!corps) return json({ ok: false, erreur: 'Requête invalide.' }, 400);

  // Anti-spam 1 : champ piège rempli → on fait semblant d'accepter.
  if (typeof corps.site === 'string' && corps.site.trim() !== '') return json({ ok: true });

  // Anti-spam 2 : jeton signé par le serveur, vieux d'au moins 3 s.
  const verif = await verifierJeton(corps.jeton, s);
  if (verif === 'trop-tot') return json({ ok: false, erreur: 'Envoi trop rapide, réessayez.' }, 429);
  if (verif !== 'ok') return json({ ok: false, erreur: 'Session expirée, rechargez la page.' }, 403);

  // Anti-spam 3 : limite par IP.
  if (!parIp(adresseIp(request.headers))) return json({ ok: false, erreur: TROP }, 429);

  const r = schemaSuggestion.safeParse(corps.reponses);
  if (!r.success) return json({ ok: false, erreur: 'Réponses incomplètes.' }, 422);

  let config;
  try {
    config = lireConfigMail();
  } catch (e) {
    console.error('[suggestions]', e instanceof Error ? e.message : 'configuration invalide');
    return json({ ok: false, erreur: NON_CONFIGURE }, 500);
  }

  // Anti-spam 4 : un jeton ne sert qu'une fois (un robot ne peut pas rejouer la même requête).
  if (!dejaUtilise(corps.jeton as string)) {
    return json({ ok: false, erreur: 'Session expirée, rechargez la page.' }, 403);
  }
  // Anti-spam 5 : plafonds globaux, pour ne jamais noyer la boîte mail.
  if (!parHeure('tous') || !parJour('tous')) return json({ ok: false, erreur: TROP }, 429);

  const date = new Date();
  try {
    await envoyerMail(config, SUJET_MAIL, formaterSuggestion(r.data, date));
  } catch (e) {
    // Jamais le mot de passe ni le contenu de la suggestion dans les journaux : seulement le code d'erreur.
    const code = (e as { code?: unknown } | null)?.code;
    console.error('[suggestions] envoi du mail impossible :', typeof code === 'string' ? code : 'erreur');
    return json({ ok: false, erreur: "L'envoi n'a pas abouti." }, 502);
  }
  return json({ ok: true });
}
