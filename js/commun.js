/* Commun à toutes les pages : langue FR/EN, chargement des textes (donnees/*.json), menu, liens internes.
   Aucun cookie. Seul le choix de langue est gardé dans le stockage local du navigateur. */
(() => {
  const base = document.body.dataset.base || '';              // '' à la racine, '../' dans un sous-dossier
  const get = (o, chemin) => chemin.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const lireLangue = () => {
    const p = new URLSearchParams(location.search).get('lang');
    if (p === 'fr' || p === 'en') return p;
    try { const s = localStorage.getItem('langue-oriana'); if (s === 'fr' || s === 'en') return s; } catch (_) {}
    return 'fr';
  };
  // Aperçu de l'éditeur (/admin/) : seulement dans son cadre nommé, et jamais pour un visiteur ; applique le thème en cours d'édition.
  if (window.name === 'apercu-oriana') try { const c = sessionStorage.getItem('apercu_theme'); if (c) { const st = document.createElement('style'); st.textContent = c; document.head.appendChild(st); } } catch (_) {}
  const OV = window.OV = {
    base, lang: lireLangue(), T: null, L: null, ecouteurs: [],
    t: (chemin) => get(OV.T, chemin),
    quandLangue: (f) => OV.ecouteurs.push(f),
    adresse: (cible) => base + cible + (OV.lang === 'en' ? '?lang=en' : ''),
  };
  // Les SVG (img/ange.svg, img/symboles/) gardent leurs couleurs d'origine dans le fichier (rendu strictement identique) ; cette table dit
  // à quelle variable du thème chacune correspond. Intégrés à la page (pages.js) : couleur remplacée par var(--x). En <img> / <image> :
  // les pages mettent le fichier tel quel, puis svgThemeUrl() renvoie une copie recolorée seulement si le thème a changé (sinon null).
  const COULEURS_SVG = {'#0a0a0a': 'bg', '#f2efea': 'ink', '#b8975a': 'or', '#a8292e': 'rouge', '#d9be84': 'or-clair', '#f4e6c2': 'or-pale', '#e6d3a3': 'or-reflet'};
  OV.recolorer = (t, valeur) => t.replace(/#[0-9a-fA-F]{6}/g, (c) => { const n = COULEURS_SVG[c.toLowerCase()]; return n ? valeur(n, c) : c; });
  const cacheSvg = {};
  const chargee = new Promise((ok) => { if (document.readyState === 'complete') ok(); else addEventListener('load', () => ok()); });   // on ne touche pas au rendu avant la fin du chargement
  OV.svgThemeUrl = (url) => chargee.then(() => {
    const cs = getComputedStyle(document.documentElement);
    if (Object.entries(COULEURS_SVG).every(([c, n]) => cs.getPropertyValue('--' + n).trim().toLowerCase() === c)) return null;   // thème d'origine : rien à changer
    if (!cacheSvg[url]) cacheSvg[url] = fetch(base + url).then((r) => r.text()).catch(() => '');
    return cacheSvg[url].then((t) => {
      if (!t) return null;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(OV.recolorer(t, (n, c) => cs.getPropertyValue('--' + n).trim() || c));
    });
  });
  // Couleur de la barre du navigateur : suit le fond du thème
  addEventListener('load', () => {
    const fond = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), mt = document.querySelector('meta[name="theme-color"]');
    if (fond && mt) mt.content = fond;
  });
  const charger = (lang) => Promise.all([
    fetch(base + 'donnees/' + lang + '.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch(base + 'donnees/liens.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  OV.pret = charger(OV.lang).then(([T, L]) => { OV.T = T; OV.L = L; return OV; });

  // Libellés et liens internes
  OV.appliquer = () => {
    document.documentElement.lang = OV.lang;
    document.querySelectorAll('[data-i18n]').forEach((e) => { const v = OV.t(e.dataset.i18n); if (typeof v === 'string') e.textContent = v; });
    document.querySelectorAll('[data-i18n-aria]').forEach((e) => { const v = OV.t(e.dataset.i18nAria); if (typeof v === 'string') e.setAttribute('aria-label', v); });
    document.querySelectorAll('a[data-int]').forEach((a) => { a.href = OV.adresse(a.dataset.int); });
    document.querySelectorAll('.outils a[data-lang]').forEach((a) => {
      const actif = a.dataset.lang === OV.lang;
      if (actif) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    const bouton = document.getElementById('bouton-menu'), menu = document.getElementById('menu');
    if (bouton) bouton.setAttribute('aria-label', OV.t(menu.classList.contains('ouvert') ? 'ui.menu_fermer' : 'ui.menu_ouvrir'));
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Menu
    const bouton = document.getElementById('bouton-menu'), menu = document.getElementById('menu');
    bouton.addEventListener('click', () => {
      const o = menu.classList.toggle('ouvert');
      bouton.setAttribute('aria-expanded', o);
      bouton.setAttribute('aria-label', OV.t(o ? 'ui.menu_fermer' : 'ui.menu_ouvrir') || '');
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('ouvert')) bouton.click(); });
    menu.addEventListener('click', (e) => { if (e.target === menu) bouton.click(); });
    // Choix de langue (sans recharger la page)
    document.querySelectorAll('.outils a[data-lang]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const l = a.dataset.lang; if (l === OV.lang) return;
      OV.lang = l;
      try { localStorage.setItem('langue-oriana', l); } catch (_) {}
      history.replaceState(null, '', location.pathname + (l === 'en' ? '?lang=en' : ''));
      charger(l).then(([T, L]) => { OV.T = T; OV.L = L; OV.appliquer(); OV.ecouteurs.forEach((f) => f()); });
    }));
    OV.pret.then(() => { OV.appliquer(); }).catch(() => {});
  });
})();
