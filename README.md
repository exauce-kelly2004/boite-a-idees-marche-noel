# Boîte à idées · Marché de Noël UCAO-UUC

Formulaire de suggestions anonyme en **Next.js 16 + React + TypeScript + Tailwind**.
Quand un étudiant clique sur **Envoyer**, le serveur envoie la suggestion **par mail** à la boîte de réception (`MAIL_DESTINATAIRE`).
**Aucune base de données** : rien n'est enregistré sur le site, tout arrive dans la boîte mail.

## Lancer en local

```bash
npm config set cache "D:\npm-cache" --location=user   # le disque C est plein
npm install
npm run dev        # http://localhost:3000
npm run test       # 21 tests
npm run lint
npm run build
```

Toute la configuration secrète est dans `.env.local` (jamais dans le code ni dans Git). Modèle : `.env.example`.

## Envoi par mail : le seul réglage à faire

Le site se connecte à Gmail avec un **mot de passe d'application** (un mot de passe spécial de 16 lettres, différent du mot de passe habituel, que l'on peut supprimer à tout moment).

1. Se connecter au compte Gmail qui reçoit les suggestions.
2. Activer la **validation en deux étapes** : https://myaccount.google.com/security
3. Créer le mot de passe d'application : https://myaccount.google.com/apppasswords (nom : « Boîte à idées »).
4. Coller les 16 lettres dans `.env.local`, ligne `GMAIL_MOT_DE_PASSE_APPLI=`, puis relancer le serveur.

| Variable | Rôle |
|---|---|
| `MAIL_DESTINATAIRE` | Boîte qui reçoit les suggestions |
| `GMAIL_COMPTE` | Compte Gmail qui expédie (vide = le même que `MAIL_DESTINATAIRE`) |
| `GMAIL_MOT_DE_PASSE_APPLI` | Mot de passe d'application de ce compte |
| `JETON_SECRET` | Clé secrète des jetons anti-robot (32 caractères minimum) |
| `SITE_URL` | Adresse publique du site (aperçu du lien partagé) |

Toutes les suggestions arrivent dans une même conversation Gmail, objet « Suggestions · Marché de Noël » (Gmail ouvre une nouvelle conversation tous les 100 mails).
Gmail accepte environ 500 mails par jour : le site s'arrête de lui-même à 450.

## Mise en ligne (Vercel)

Renseigner les 5 variables ci-dessus dans Vercel → Settings → Environment Variables, puis déployer.

## Organisation

| Fichier | Rôle |
|---|---|
| `src/app/page.tsx`, `src/components/` | Page et composants (`CarteQuestion`, `ChoixUnique`/`ChoixMultiples`, `TexteLong`, `BoutonEnvoyer`, `EcranMerci`) |
| `src/app/api/suggestions/route.ts` | Serveur : jeton anti-robot, limites, validation, envoi du mail |
| `src/lib/formulaire.ts` | Textes des questions + schéma zod (partagé navigateur / serveur) |
| `src/lib/message.ts` | Objet et texte du mail, heure du Bénin |
| `src/lib/mail.ts` | Connexion à Gmail et envoi |
| `src/lib/jeton.ts`, `src/lib/limite.ts` | Jetons signés à usage unique, limites d'envoi |

L'ancien code WhatsApp + Neon est conservé dans `../_ancien-whatsapp-neon/`.

## Sécurité

- Adresse mail et mot de passe uniquement dans les variables d'environnement du serveur ; jamais dans le navigateur ni dans les journaux.
- Jeton anti-robot **signé par le serveur** (HMAC-SHA256) : 3 s minimum entre l'affichage et l'envoi, validité 12 h, **utilisable une seule fois**.
- Champ piège invisible ; 20 envois par heure et par IP ; plafonds globaux de 200 mails par heure et 450 par jour.
- Requêtes limitées à 64 Ko, JSON obligatoire, requêtes venant d'un autre site refusées, validation stricte (zod) des deux côtés.
- Mail en **texte brut** : rien de ce qu'écrit un visiteur ne peut s'exécuter ni modifier le destinataire ou l'objet.
- Textes nettoyés (caractères invisibles ou d'inversion retirés, précisions « Autre » sur une ligne).
- En-têtes de sécurité : CSP, interdiction d'intégrer le site dans un autre (`frame-ancestors 'none'`), `nosniff`, HSTS.
- Limites connues : sur Vercel, les compteurs anti-spam sont propres à chaque instance du serveur ; l'adresse IP n'est fiable que derrière Vercel (qui l'écrit lui-même).
- Si l'envoi du mail échoue, le visiteur voit un message d'erreur et peut réessayer : la suggestion n'est gardée nulle part ailleurs.
