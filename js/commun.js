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
  const OV = window.OV = {
    base, lang: lireLangue(), T: null, L: null, ecouteurs: [],
    t: (chemin) => get(OV.T, chemin),
    quandLangue: (f) => OV.ecouteurs.push(f),
    adresse: (cible) => base + cible + (OV.lang === 'en' ? '?lang=en' : ''),
  };
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
