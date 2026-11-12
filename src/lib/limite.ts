/**
 * Limites d'envoi en mémoire (aucune adresse IP n'est enregistrée ailleurs).
 * Attention : sur un hébergement « serverless », chaque instance a sa propre mémoire ;
 * ces limites freinent les abus mais ne sont pas absolues.
 */
const UNE_HEURE = 60 * 60 * 1000;

export function creerLimiteur(max = 5, fenetreMs = UNE_HEURE) {
  const envois = new Map<string, number[]>();
  return function autoriser(cle: string, maintenant = Date.now()): boolean {
    const recents = (envois.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs);
    if (recents.length >= max) {
      envois.set(cle, recents);
      return false;
    }
    recents.push(maintenant);
    envois.set(cle, recents);
    // Nettoyage pour ne pas grossir indéfiniment (attaque avec beaucoup d'IP).
    if (envois.size > 5000) {
      for (const [k, v] of envois) if (!v.some((t) => maintenant - t < fenetreMs)) envois.delete(k);
    }
    return true;
  };
}

/**
 * Adresse IP du visiteur, telle que posée par l'hébergeur (Vercel).
 * Vercel écrase lui-même `x-real-ip` et `x-forwarded-for` : le visiteur ne peut pas les inventer.
 * On ne lit AUCUN autre en-tête (ex. `cf-connecting-ip`), car le visiteur pourrait l'envoyer
 * lui-même avec une fausse adresse pour échapper à la limite.
 */
export function adresseIp(headers: Headers): string {
  const reelle = headers.get('x-real-ip')?.trim();
  if (reelle) return reelle.slice(0, 64);
  const xff = headers.get('x-forwarded-for');
  // Le dernier maillon est ajouté par le proxy de l'hébergeur ; les premiers sont déclaratifs.
  const ip = xff?.split(',').map((s) => s.trim()).filter(Boolean).pop();
  return ip ? ip.slice(0, 64) : 'inconnue';
}
