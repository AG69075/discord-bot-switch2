# discord-bot-switch2

Bot Discord qui affiche automatiquement, en statut d'activité (« 🕹️ En train de jouer à ... »), le dernier jeu Switch / Switch 2 joué sur un profil [Exophase](https://www.exophase.com/).

## Fonctionnement

- [scraper.js](scraper.js) récupère la page du profil Exophase via une simple requête HTTP ([impit](https://www.npmjs.com/package/impit), qui imite l'empreinte TLS d'un navigateur pour passer le filtrage Cloudflare), extrait la liste des jeux écrite en dur dans le HTML (`window.playerGames`) et retient celui avec le `lastplayed` le plus récent parmi les plateformes Switch/Switch 2. Pas de navigateur headless : empreinte mémoire minime.
- [index.js](index.js) se connecte à Discord, appelle le scraper au démarrage puis à intervalle régulier, et réaffirme la présence du bot à chaque cycle (ainsi que sur `shardResume`, Discord pouvant perdre la présence lors d'une reconnexion du gateway).

## Prérequis

- Node.js 22+
- Un bot Discord (token) avec l'intent `Guilds`

## Configuration

Créer un fichier `.env` à la racine :

```
DISCORD_TOKEN=token_du_bot_discord
EXOPHASE_USER=pseudo_exophase
UPDATE_INTERVAL=900000
DEBUG=false
```

- `DISCORD_TOKEN` (obligatoire) : token du bot Discord.
- `EXOPHASE_USER` : pseudo du profil Exophase à surveiller (défaut : `bloodshine`).
- `UPDATE_INTERVAL` : intervalle entre deux vérifications, en ms (défaut : 900000 = 15 min).

Le contournement du filtrage Cloudflare d'Exophase repose uniquement sur l'imitation de l'empreinte TLS par `impit` (Cloudflare ne sert ici qu'un filtrage passif, pas de challenge JS à résoudre). Si Exophase durcit sa protection, envisager un sidecar type FlareSolverr ou un retour à un navigateur headless.

## Installation & lancement

```bash
npm install
npm start
```

## Docker

Une image Docker légère (Node 22 Alpine, sans navigateur) est fournie :

```bash
docker build -t discord-bot-switch2 .
docker run --env-file .env discord-bot-switch2
```

Le binaire natif d'`impit` adapté à la plateforme est téléchargé au `npm ci`
pendant le build (prebuilds `linux-x64-musl` / `linux-arm64-musl` inclus).

## Structure

| Fichier | Rôle |
|---|---|
| `index.js` | Démarrage du bot Discord, boucle de mise à jour de la présence |
| `scraper.js` | Récupération HTTP du profil Exophase et extraction du dernier jeu Switch |
| `test-scraper.js` | Script de test du scraper en isolation |
| `Dockerfile` | Image de production (utilisateur non-root, healthcheck, tini) |
