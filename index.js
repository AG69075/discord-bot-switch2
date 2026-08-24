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

async function updatePresence() {
  if (!client.user) { log('[Bot] client.user pas prêt, skip.'); return; }
  if (isUpdating) { log('[Bot] Déjà en cours, skip.'); return; }
  
  isUpdating = true;
  log('[Bot] === Début scrape ===');
  
  try {
    const game = await getLatestSwitch2Game();
    if (game) {
      if (game !== lastGame) {
        lastGame = game;
        await client.user.setPresence({
          activities: [{ name: '🕹️ ' + game, type: ActivityType.Playing }],
          status: 'online',
        });
        log(`[Bot] ✅ Activité mise à jour : 🕹️ ${game}`);
      } else {
        log(`[Bot] Pas de changement : ${game}`);
      }
    } else {
      if (lastGame !== null) {
        lastGame = null;
        await client.user.setPresence({ activities: [], status: 'online' });
        log('[Bot] Activité effacée.');
      } else {
        log('[Bot] Aucun jeu Switch 2, activité déjà vide.');
      }
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

// --- RÉSILIENCE : Crash contrôlé ---
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Promesse rejetée non gérée:', reason);
  // On laisse le processus s'arrêter pour que Docker (tini) gère le redémarrage
  process.exit(1); 
});
// -----------------------------------

log('[Bot] Connexion à Discord...');
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error(`[Bot] ÉCHEC LOGIN: ${err.message}`);
  process.exit(1);
});