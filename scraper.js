const puppeteer = require('puppeteer-core');

const EXOPHASE_USER = process.env.EXOPHASE_USER || 'bloodshine';
const EXOPHASE_URL = `https://www.exophase.com/user/${encodeURIComponent(EXOPHASE_USER)}/`;

function log(msg) {
  const line = '[' + new Date().toLocaleString('fr-FR') + '] [Scraper] ' + msg;
  console.log(line);
}

async function getLatestSwitch2Game() {
  let browser;
  log('Démarrage Puppeteer...');
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      dumpio: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
      ],
    });
    log('Chromium lancé, navigation vers Exophase...');

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.goto(EXOPHASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    log('Page chargée.');

    const result = await page.evaluate(() => {
      if (typeof window.playerGames === 'undefined') return { error: 'window.playerGames absent' };
      let data;
      try {
        data = typeof window.playerGames === 'string' ? JSON.parse(window.playerGames) : window.playerGames;
      } catch(e) { return { error: 'Parse JSON: ' + e.message }; }

      const games = data.games || [];

      // Collecter TOUS les jeux Switch/Switch 2 et garder celui avec le lastplayed le plus récent
      let latest = null;
      for (const g of games) {
        const meta = g.meta || {};
        const platforms = meta.platforms || [];
        const slugs = meta.platform_slugs || [];
        const isS2 = platforms.some(p => {
                    const slug = (p.slug||'').toLowerCase();
                    const name = (p.name||'').toLowerCase();
                    return slug.includes('switch') || name.includes('switch');
                  }) || slugs.some(s => (s||'').toLowerCase().includes('switch'));
        if (isS2 && (!latest || (g.lastplayed || 0) > (latest.lastplayed || 0))) {
          latest = { title: meta.title, lastplayed: g.lastplayed, count: games.length };
        }
      }

      if (latest) return latest;
      return { notFound: true, count: games.length };
    });

    if (result.error) { log('ERREUR: ' + result.error); return null; }
    if (result.notFound) { log('Aucun jeu Switch/Switch 2 parmi ' + result.count + ' jeux.'); return null; }
    log('✅ Trouvé : "' + result.title + '" (joué le ' + new Date(result.lastplayed * 1000).toLocaleDateString('fr-FR') + ')');
    return result.title;

  } catch(err) {
    log('ERREUR Puppeteer: ' + err.message);
    return null;
  } finally {
    if (browser) { await browser.close(); log('Chromium fermé.'); }
  }
}

module.exports = { getLatestSwitch2Game };