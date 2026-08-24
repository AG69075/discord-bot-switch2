/**
 * Script de test standalone — lance uniquement le scraper sans Discord.
 * Utile pour déboguer directement dans le container.
 *
 * Usage depuis le NAS (SSH dans le container) :
 *   node test-scraper.js
 */
require('dotenv').config();
const { getLatestSwitch2Game } = require('./scraper');

(async () => {
  console.log('=== TEST SCRAPER EXOPHASE ===');
  const game = await getLatestSwitch2Game();
  console.log('=== RÉSULTAT ===');
  console.log(game ? `Dernier jeu Switch 2 : ${game}` : 'Aucun jeu trouvé');
  process.exit(0);
})();
