require('dotenv').config();

// SUPPRESSION DES MODULES fs ET path (Immutabilité respectée)
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { getLatestSwitch2Game } = require('./scraper');

// --- SHIFT LEFT : Validation stricte des secrets ---
if (!process.env.DISCORD_TOKEN) {
  console.error('[FATAL] DISCORD_TOKEN manquant dans les variables d\'environnement. Arrêt immédiat.');
  process.exit(1);
}
// ---------------------------------------------------

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 900000;
let isUpdating = false;
let lastGame = null;

// Remplacement par la sortie standard uniquement
function log(msg) {
  const line = `[${new Date().toLocaleString('fr-FR')}] ${msg}`;
  console.log(line); // Docker va capturer ceci automatiquement
}

// discord.js v14 : setPresence() est SYNCHRONE (renvoie un ClientPresence, pas
// une Promise) et peut lever une exception (ws pas prêt, nom invalide...).
// On l'isole donc dans un try/catch pour ne jamais faire remonter d'erreur
// jusqu'à un listener d'événement (ce qui crasherait le process).
function applyPresence(game) {
  try {
    client.user.setPresence(game
      ? { activities: [{ name: '🕹️ ' + game, type: ActivityType.Playing }], status: 'online' }
      : { activities: [], status: 'online' });
    return true;
  } catch (err) {
    console.error(`[Bot] Erreur setPresence: ${err.message}`);
    return false;
  }
}

async function updatePresence() {
  if (!client.user) { log('[Bot] client.user pas prêt, skip.'); return; }
  if (isUpdating) { log('[Bot] Déjà en cours, skip.'); return; }

  isUpdating = true;
  log('[Bot] === Début scrape ===');

  try {
    const game = await getLatestSwitch2Game();
    if (game) {
      const changed = game !== lastGame;
      lastGame = game;
      // Renvoyé à chaque cycle même sans changement : Discord peut perdre la
      // présence (reconnexion/resume du gateway) sans que le bot le sache,
      // donc on ne peut pas se fier uniquement au cache local pour décider.
      applyPresence(game);
      log(changed
        ? `[Bot] ✅ Activité mise à jour : 🕹️ ${game}`
        : `[Bot] Présence réaffirmée (pas de changement) : ${game}`);
    } else {
      lastGame = null;
      applyPresence(null);
      log('[Bot] Aucun jeu Switch 2, activité vide.');
    }
  } catch (err) {
    // Redirection des erreurs vers stderr
    console.error(`[Bot] ERREUR LORS DU SCRAPE: ${err.message}`); 
  } finally {
    log(`[Bot] RAM: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
    log(`[Bot] Prochain scrape dans ${UPDATE_INTERVAL / 60000} min`);
    log('[Bot] === Fin scrape ===\n');
    isUpdating = false;
  }
}

client.once('ready', async () => {
  log(`[Bot] Connecté : ${client.user.tag}`);
  log(`[Bot] Intervalle : ${UPDATE_INTERVAL / 60000} min`);
  await updatePresence();
  setInterval(updatePresence, UPDATE_INTERVAL);
});

// Séparation des logs d'erreurs (stderr)
client.on('error', (err) => console.error(`[Bot] Erreur Discord: ${err.message}`));

// Discord efface la présence lors d'une reconnexion/resume du gateway ;
// on la réapplique immédiatement plutôt que d'attendre le prochain scrape.
client.on('shardResume', () => {
  log('[Bot] Gateway reconnecté (resume), réapplication de la présence.');
  if (client.user && lastGame) applyPresence(lastGame);
});

// --- RÉSILIENCE : Crash contrôlé ---
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Promesse rejetée non gérée:', reason);
  // On laisse le processus s'arrêter ; la policy de restart du conteneur relance.
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Exception non interceptée:', err);
  process.exit(1);
});
// -----------------------------------

log('[Bot] Connexion à Discord...');
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error(`[Bot] ÉCHEC LOGIN: ${err.message}`);
  process.exit(1);
});