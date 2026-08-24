# discord-bot-switch2

Bot Discord qui affiche automatiquement, en statut d'activité (« 🕹️ En train de jouer à ... »), le dernier jeu Switch / Switch 2 joué sur un profil [Exophase](https://www.exophase.com/).

## Fonctionnement

- [scraper.js](scraper.js) lance un navigateur headless (Puppeteer/Chromium) sur la page du profil Exophase configuré, extrait la liste des jeux (`window.playerGames`) et retient celui avec le `lastplayed` le plus récent parmi les plateformes Switch/Switch 2.
- [index.js](index.js) se connecte à Discord, appelle le scraper au démarrage puis à intervalle régulier, et met à jour la présence du bot uniquement si le jeu détecté a changé.

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

`ZENROWS_API_KEY` n'est pas utilisé par le code actuellement (aucun contournement anti-bot n'est implémenté) ; à ajouter uniquement si un blocage d'Exophase est constaté.

## Installation & lancement

```bash
npm install
npm start
```

## Docker

Une image Docker (Node 22 Alpine + Chromium) est fournie :

```bash
docker build -t discord-bot-switch2 .
docker run --env-file .env discord-bot-switch2
```

## Structure

| Fichier | Rôle |
|---|---|
| `index.js` | Démarrage du bot Discord, boucle de mise à jour de la présence |
| `scraper.js` | Scraping du profil Exophase via Puppeteer |
| `test-scraper.js` | Script de test du scraper en isolation |
| `Dockerfile` | Image de production (utilisateur non-root, healthcheck, tini) |
