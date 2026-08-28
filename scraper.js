const { Impit } = require('impit');

const EXOPHASE_USER = process.env.EXOPHASE_USER || 'bloodshine';
const EXOPHASE_URL = `https://www.exophase.com/user/${encodeURIComponent(EXOPHASE_USER)}/`;

function log(msg) {
  const line = '[' + new Date().toLocaleString('fr-FR') + '] [Scraper] ' + msg;
  console.log(line);
}

// La page Exophase écrit la liste des jeux en dur dans le HTML sous la forme
//   window.playerGames = '{ ... }';
// (chaîne JS entièrement échappée). Aucun JS à exécuter : une simple requête
// HTTP suffit. Cloudflare ne fait ici que du filtrage passif par empreinte TLS,
// d'où l'usage d'impit qui imite le handshake d'un vrai navigateur.
function extractPlayerGames(html) {
  const m = html.match(/playerGames\s*=\s*'((?:[^'\\]|\\.)*)'/);
  if (!m) return null;

  // Le corps capturé est un littéral de chaîne JS : on le réinterprète comme
  // une chaîne JSON (\uXXXX, \/, \\ sont communs aux deux ; seul \' diffère).
  const asJsonString = '"' + m[1].replace(/(?<!\\)"/g, '\\"').replace(/\\'/g, "'") + '"';
  const jsonText = JSON.parse(asJsonString);
  return JSON.parse(jsonText);
}

function isSwitch(meta) {
  const platforms = meta.platforms || [];
  const slugs = meta.platform_slugs || [];
  return platforms.some(p => {
    const slug = (p.slug || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    return slug.includes('switch') || name.includes('switch');
  }) || slugs.some(s => (s || '').toLowerCase().includes('switch'));
}

async function getLatestSwitch2Game() {
  log('Récupération de la page Exophase...');
  try {
    const impit = new Impit({ browser: 'chrome', timeout: 30000 });
    const res = await impit.fetch(EXOPHASE_URL, {
      headers: { 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
    });
    if (!res.ok) { log('ERREUR: HTTP ' + res.status); return null; }

    const html = await res.text();
    const data = extractPlayerGames(html);
    if (!data) { log('ERREUR: window.playerGames introuvable dans le HTML'); return null; }

    const games = data.games || [];

    // Collecter TOUS les jeux Switch/Switch 2 et garder celui avec le
    // lastplayed le plus récent.
    let latest = null;
    for (const g of games) {
      const meta = g.meta || {};
      if (isSwitch(meta) && (!latest || (g.lastplayed || 0) > (latest.lastplayed || 0))) {
        latest = { title: meta.title, lastplayed: g.lastplayed };
      }
    }

    if (!latest) {
      log('Aucun jeu Switch/Switch 2 parmi ' + games.length + ' jeux.');
      return null;
    }
    log('✅ Trouvé : "' + latest.title + '" (joué le ' +
      new Date(latest.lastplayed * 1000).toLocaleDateString('fr-FR') + ')');
    return latest.title;

  } catch (err) {
    log('ERREUR récupération : ' + err.message);
    return null;
  }
}

module.exports = { getLatestSwitch2Game };
