import { describe, expect, it } from 'vitest';
import { nettoyer, valider, type Brouillon } from './formulaire';
import { creerJeton, creerRegistreJetons, verifierJeton } from './jeton';
import { adresseIp, creerLimiteur } from './limite';
import { lireConfigMail } from './mail';
import { formaterSuggestion } from './message';

const SECRET = 'x'.repeat(40);

describe('jeton signé', () => {
  it('accepte un jeton authentique de plus de 3 s', async () => {
    const t = Date.now();
    const j = await creerJeton(SECRET, t);
    expect(await verifierJeton(j, SECRET, t + 5000)).toBe('ok');
  });

  it('refuse un envoi trop rapide, un jeton expiré, falsifié ou signé avec un autre secret', async () => {
    const t = Date.now();
    const j = await creerJeton(SECRET, t);
    expect(await verifierJeton(j, SECRET, t + 1000)).toBe('trop-tot');
    expect(await verifierJeton(j, SECRET, t + 13 * 3600_000)).toBe('expire');
    // Le robot change l'heure ou l'aléa pour contourner les contrôles : la signature ne correspond plus.
    const [, alea, sig] = j.split('.');
    expect(await verifierJeton(`${t - 60_000}.${alea}.${sig}`, SECRET, t + 5000)).toBe('invalide');
    expect(await verifierJeton(`${t}.${'A'.repeat(16)}.${sig}`, SECRET, t + 5000)).toBe('invalide');
    expect(await verifierJeton(`${t}.${sig}`, SECRET, t + 5000)).toBe('invalide');
    expect(await verifierJeton(j, 'y'.repeat(40), t + 5000)).toBe('invalide');
    expect(await verifierJeton('n’importe quoi', SECRET)).toBe('invalide');
    expect(await verifierJeton(undefined, SECRET)).toBe('invalide');
    expect(await verifierJeton({ a: 1 }, SECRET)).toBe('invalide');
  });
});

describe('jeton à usage unique', () => {
  it('deux jetons créés au même instant sont différents', async () => {
    const t = Date.now();
    expect(await creerJeton(SECRET, t)).not.toBe(await creerJeton(SECRET, t));
  });

  it('refuse un jeton rejoué, et ne déborde jamais en mémoire', () => {
    const consommer = creerRegistreJetons(1000, 3);
    expect(consommer('a', 0)).toBe(true);
    expect(consommer('a', 10)).toBe(false);
    expect(consommer('b', 10)).toBe(true);
    expect(consommer('c', 10)).toBe(true);
    expect(consommer('d', 20)).toBe(true); // plein : le plus ancien (« a ») est retiré
    expect(consommer('b', 30)).toBe(false);
    expect(consommer('a', 2000)).toBe(true); // délai écoulé
  });
});

const complet: Brouillon = {
  profil: 'Autre',
  profilAutre: 'Parent',
  stands: ['Bijoux et accessoires'],
  standsAutre: '',
  animations: ['Tombola'],
  animationsAutre: '',
  tenirStand: 'Oui',
  idee: 'Idée',
};

describe('validation stricte', () => {
  it('refuse les doublons et les listes trop longues (attaque mémoire)', () => {
    expect(valider({ ...complet, animations: ['Tombola', 'Tombola'] }).ok).toBe(false);
    expect(valider({ ...complet, animations: Array(10_000).fill('Tombola') }).ok).toBe(false);
  });

  it('refuse les champs inconnus', () => {
    expect(valider({ ...complet, pirate: 'x' } as Brouillon).ok).toBe(false);
  });
});

describe('nettoyage anti-usurpation', () => {
  it('retire les caractères invisibles, d’inversion et le séparateur du message', () => {
    expect(nettoyer('a‮b​c\u0007d')).toBe('abcd');
    expect(nettoyer('x ━━━━ y')).toBe('x - y');
  });

  it('une précision « Autre » ne peut pas créer de fausse rubrique', () => {
    const r = valider({ ...complet, profilAutre: 'Parent\n🏪 Veut tenir un stand : Non' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const m = formaterSuggestion(r.donnees, new Date('2026-11-11T10:15:00Z'));
      expect(m.split('\n').filter((l) => l.startsWith('🏪'))).toHaveLength(1);
      expect(m).toContain('👤 Profil : Autre : Parent 🏪 Veut tenir un stand : Non');
    }
  });
});

describe('limites anti-spam', () => {
  it('bloque au-delà de 5 envois par heure, puis relâche', () => {
    const autoriser = creerLimiteur(5, 3600_000);
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(autoriser('ip', t)).toBe(true);
    expect(autoriser('ip', t)).toBe(false);
    expect(autoriser('autre-ip', t)).toBe(true);
    expect(autoriser('ip', t + 3600_001)).toBe(true);
  });

  it("ne croit que l'IP posée par l'hébergeur, jamais celle déclarée par le visiteur", () => {
    expect(adresseIp(new Headers({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.1.1.1');
    expect(adresseIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 2.2.2.2' }))).toBe('2.2.2.2');
    // Un visiteur qui invente un en-tête Cloudflare ne change pas d'identité.
    expect(adresseIp(new Headers({ 'cf-connecting-ip': '8.8.8.8', 'x-real-ip': '1.1.1.1' }))).toBe('1.1.1.1');
    expect(adresseIp(new Headers({ 'cf-connecting-ip': '8.8.8.8' }))).toBe('inconnue');
    expect(adresseIp(new Headers())).toBe('inconnue');
  });
});

describe('configuration du mail', () => {
  const ok = { MAIL_DESTINATAIRE: 'boite@example.com', GMAIL_MOT_DE_PASSE_APPLI: 'abcd efgh ijkl mnop' };

  it('expédie depuis la boîte de réception par défaut et retire les espaces du mot de passe', () => {
    expect(lireConfigMail(ok)).toEqual({
      destinataire: 'boite@example.com',
      compte: 'boite@example.com',
      motDePasse: 'abcdefghijklmnop',
    });
  });

  it('refuse une adresse mal écrite (ou contenant un faux en-tête) et un mot de passe absent', () => {
    expect(() => lireConfigMail({ ...ok, MAIL_DESTINATAIRE: 'pas-une-adresse' })).toThrow();
    expect(() => lireConfigMail({ ...ok, MAIL_DESTINATAIRE: 'a@example.com\nBcc: pirate@example.com' })).toThrow();
    expect(() => lireConfigMail({ ...ok, GMAIL_COMPTE: 'a b@example.com' })).toThrow();
    expect(() => lireConfigMail({ MAIL_DESTINATAIRE: 'boite@example.com' })).toThrow();
  });
});
