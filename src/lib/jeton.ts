/**
 * Jeton anti-robot signé par le serveur (HMAC-SHA256).
 * Le formulaire le reçoit à l'affichage ; à l'envoi, le serveur vérifie
 * qu'il est authentique, vieux d'au moins 3 s et de moins de 12 h,
 * et qu'il n'a pas déjà servi (un jeton = une seule suggestion).
 * Format : « heure.aléa.signature ».
 */
export const AGE_MIN_MS = 3000;
export const AGE_MAX_MS = 12 * 60 * 60 * 1000;

const enc = new TextEncoder();

function enBase64Url(octets: ArrayBuffer | Uint8Array): string {
  let bin = '';
  for (const o of new Uint8Array(octets)) bin += String.fromCharCode(o);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function depuisBase64Url(texte: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(texte)) return null; // 32 octets
  const bin = atob(texte.replace(/-/g, '+').replace(/_/g, '/') + '=');
  const octets = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
  return octets;
}

function cle(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function creerJeton(secret: string, maintenant = Date.now()): Promise<string> {
  // L'aléa rend chaque jeton unique, même pour deux visiteurs arrivés à la même milliseconde.
  const alea = enBase64Url(crypto.getRandomValues(new Uint8Array(12)));
  const contenu = `${maintenant}.${alea}`;
  const signature = await crypto.subtle.sign('HMAC', await cle(secret, 'sign'), enc.encode(contenu));
  return `${contenu}.${enBase64Url(signature)}`;
}

export type VerificationJeton = 'ok' | 'invalide' | 'trop-tot' | 'expire';

export async function verifierJeton(
  jeton: unknown,
  secret: string,
  maintenant = Date.now(),
): Promise<VerificationJeton> {
  if (typeof jeton !== 'string' || jeton.length > 80) return 'invalide';
  const morceaux = jeton.split('.');
  if (morceaux.length !== 3) return 'invalide';
  const [horodatage, alea, sig] = morceaux as [string, string, string];
  if (!/^\d{13}$/.test(horodatage) || !/^[A-Za-z0-9_-]{16}$/.test(alea)) return 'invalide';
  const octets = depuisBase64Url(sig);
  if (!octets) return 'invalide';
  // crypto.subtle.verify compare en temps constant.
  const ok = await crypto.subtle.verify(
    'HMAC',
    await cle(secret, 'verify'),
    octets,
    enc.encode(`${horodatage}.${alea}`),
  );
  if (!ok) return 'invalide';
  const age = maintenant - Number(horodatage);
  if (age < AGE_MIN_MS) return 'trop-tot';
  if (age > AGE_MAX_MS) return 'expire';
  return 'ok';
}

/**
 * Registre des jetons déjà utilisés : le même jeton ne peut pas servir deux fois.
 * Gardé en mémoire (sur un hébergement « serverless », chaque instance a le sien).
 */
export function creerRegistreJetons(dureeMs = AGE_MAX_MS, tailleMax = 20_000) {
  const utilises = new Map<string, number>();
  /** Renvoie true la première fois, false si le jeton a déjà servi. */
  return function consommer(jeton: string, maintenant = Date.now()): boolean {
    const vu = utilises.get(jeton);
    if (vu !== undefined && maintenant - vu < dureeMs) return false;
    if (utilises.size >= tailleMax) {
      for (const [k, t] of utilises) if (maintenant - t >= dureeMs) utilises.delete(k);
      // Toujours plein (attaque) : on retire les plus anciens, la Map garde l'ordre d'arrivée.
      for (const k of utilises.keys()) {
        if (utilises.size < tailleMax) break;
        utilises.delete(k);
      }
    }
    utilises.set(jeton, maintenant);
    return true;
  };
}
