// Garde-fou de durabilité : échoue si un champ du site n'a pas sa place et son libellé dans l'éditeur.
// Usage : node controle-libelles.js <dossier du site>        (copie publique : <site>/.github/controle-libelles.js)
// Règle : toute clé de donnees/fr.json (hors clés cachées) doit apparaître dans un bloc de BLOCS (libelles.js) et avoir un libellé
// (ETIQ_SEC[section][clé] ou ETIQ[clé]) ; toute clé de premier niveau doit appartenir à une section de SECTIONS.
const fs = require('fs'), path = require('path'), vm = require('vm');
const site = path.resolve(process.argv[2] || '.');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(site, 'admin/libelles.js'), 'utf8'), ctx);
const L = ctx.window.LIBELLES;
const fr = JSON.parse(fs.readFileSync(path.join(site, 'donnees/fr.json'), 'utf8'));
const liens = JSON.parse(fs.readFileSync(path.join(site, 'donnees/liens.json'), 'utf8'));
const erreurs = [];
const sectionsCles = new Set(L.SECTIONS.flatMap((s) => s.cles || []));
const estObjet = (v) => v && typeof v === 'object' && !Array.isArray(v);
const libelle = (sec, k) => { const t = L.ETIQ_SEC[sec]; const r = typeof t === 'function' ? t(k) : t && t[k]; return r || L.ETIQ[k]; };
for (const [sec, v] of Object.entries(fr)) {
  if (L.CACHES.has(sec)) continue;
  if (!sectionsCles.has(sec)) { erreurs.push(`Partie « ${sec} » de fr.json absente de SECTIONS (libelles.js) : elle n'est pas modifiable dans l'éditeur.`); continue; }
  const blocs = L.BLOCS[sec]; const dansBloc = new Set((blocs || []).flatMap((b) => b.cles || []));
  const toutDansUnBloc = (blocs || []).some((b) => !b.cles);
  for (const [k, x] of Object.entries(v)) {
    if (L.CACHES.has(k)) continue;
    if (blocs && !toutDansUnBloc && !dansBloc.has(k)) erreurs.push(`${sec}.${k} : champ absent de BLOCS (il tomberait dans « Autres réglages »).`);
    if (!libelle(sec, k)) erreurs.push(`${sec}.${k} : pas de libellé (ETIQ_SEC.${sec} ou ETIQ).`);
    const sous = Array.isArray(x) ? x.filter(estObjet)[0] : estObjet(x) ? x : null; // champs des fiches d'une liste
    if (sous) for (const c of Object.keys(sous)) if (!L.CACHES.has(c) && !libelle(sec, c)) erreurs.push(`${sec}.${k}.${c} : pas de libellé pour ce champ de fiche.`);
  }
}
for (const k of Object.keys(liens)) if (!k.startsWith('_') && !L.LIENS_ETIQ[k] && !k.startsWith('youtube_') && k !== 'reseaux') erreurs.push(`liens.${k} : pas de libellé dans LIENS_ETIQ.`);
if (erreurs.length) { console.log('ÉCHEC : l\'éditeur ne sait pas présenter tous les champs du site :\n- ' + erreurs.join('\n- ')); process.exit(1); }
console.log('OK : tous les champs de fr.json ont une place et un libellé dans l\'éditeur.');
