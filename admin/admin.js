/* Éditeur du site : modifie les textes, les liens et les photos, puis publie par l'API de GitHub.
   Aucune ressource distante sauf api.github.com. Le jeton reste dans ce navigateur (stockage local) et n'est envoyé qu'à GitHub.
   Mode essai : les changements vont d'abord dans une branche de brouillon, validée par le contrôle automatique,
   puis fusionnée dans la branche principale (publication). */
(() => {
  'use strict';
  const PROPRIO = 'oriana-valenza', DEPOT = 'oriana-valenza.github.io', PRINCIPALE = 'main';
  const R = `/repos/${PROPRIO}/${DEPOT}`;
  const LOCAL = location.hostname === 'localhost';
  const API = (LOCAL && new URLSearchParams(location.search).get('api')) || 'https://api.github.com'; // redirection permise seulement en local (tests)
  const FICHIERS = { fr: 'donnees/fr.json', en: 'donnees/en.json', liens: 'donnees/liens.json', 'bio-fr': 'donnees/bio-fr.md', 'bio-en': 'donnees/bio-en.md', theme: 'donnees/theme.json', contacts: '.github/contacts_autorises.txt' };
  const JSONS = ['fr', 'en', 'liens', 'theme'];
  const CSS_THEME = 'css/theme.css'; // généré à partir de donnees/theme.json à chaque publication (jamais saisi à la main)
  const RE_MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const RE_TEL = /(^|[^0-9.,/-])(((\+ ?33|0033)[ .-]?[1-9]|0[1-9])([ .-]?[0-9]{2}){4}|\+ ?[0-9]{1,3}([ .-]?[0-9]{2,4}){3,})(?=[^0-9]|$)/g;
  const RE_SECRET = /(password|passwd|mot de passe|secret|token|api[_-]?key)[^A-Za-z0-9]{0,3}[:=][^\]A-Za-z0-9]{0,3}[A-Za-z]*[0-9_/+-][A-Za-z0-9_/+-]{4,}/i;
  const RE_JETON = /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,})\b/;
  const MAX_TEXTE = 6000;

  /* ---------- Libellés en français ---------- */
  const { SECTIONS, GOOGLE, BLOCS, ETIQ, NOM_ELEMENT, SECTION_NOM, LIENS_ETIQ, PARTAGES, MODELES, CACHES, LONGS, ETIQ_SEC, COULEURS, POLICES, ROLES, ECHELLES, DEPOT: DEPOT_POLICE } = window.LIBELLES; // voir libelles.js
  const idYoutube = (s) => { const m = String(s || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; }; // accepte une adresse complète

  /* ---------- Thème : couleurs, contraste, génération de css/theme.css ---------- */
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  const ENTETE_CSS = "/* Thème : écrit par l'éditeur d'apparence. Ne contient que des lignes --variable:valeur. Vide = thème d'origine (voir :root de base.css). */\n";
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const versHex = (a) => '#' + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const melange = (a, b, t) => { const x = rgb(a), y = rgb(b); return versHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const luminance = (c) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const contraste = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const DEF = Object.fromEntries(COULEURS.map((c) => [c.cle, c.def.toUpperCase()]));
  const couleursDe = (t) => { const c = (t && t.couleurs) || {}; return Object.fromEntries(COULEURS.map((x) => [x.cle, HEX.test(c[x.cle] || '') ? c[x.cle].toUpperCase() : DEF[x.cle]])); };
  const couleursTheme = () => couleursDe(S.docs.theme);
  const deposees = (t = S.docs.theme) => (Array.isArray(t && t.polices_deposees) ? t.polices_deposees : []).filter((d) => d && /^[A-Za-z0-9 ]{2,40}$/.test(d.nom || '') && /^depot-[a-z0-9-]+\.(woff2|woff|ttf|otf)$/.test(d.fichier || ''));
  const policeDepot = (d) => ({ cle: d.nom, nom: d.nom + ' (ma police)', gen: 'Georgia,serif', fichier: d.fichier.replace(/\.[a-z0-9]+$/, ''), ext: d.fichier.split('.').pop(), poids: '400', texte: true, h1: 0.55, depot: true });
  const toutesPolices = (t = S.docs.theme) => [...POLICES, ...deposees(t).map(policeDepot)];
  const policeDe = (cle, t = S.docs.theme) => toutesPolices(t).find((p) => p.cle === cle);
  const policesDe = (t) => { const p = (t && t.polices) || {}; return Object.fromEntries(ROLES.map((r) => [r.cle, policeDe(p[r.cle], t) ? p[r.cle] : r.def])); };
  const taillesDe = (t) => (ECHELLES.some((e) => e.cle === (t && t.taille)) ? t.taille : 'normal');
  const policesTheme = () => policesDe(S.docs.theme), tailleTheme = () => taillesDe(S.docs.theme);
  const derivees = (c) => ({ // variantes calculées ; valeur d'origine conservée tant que la couleur de base n'est pas changée
    ligne2: c.ligne === DEF.ligne ? '#3A3A3A' : melange(c.ligne, c.ink, .08),
    'accent-clair': c.rouge === DEF.rouge ? '#D6666A' : melange(c.rouge, '#FFFFFF', .3),
    'or-clair': c.or === DEF.or ? '#D9BE84' : melange(c.or, '#FFFFFF', .3),
    'or-pale': c.or === DEF.or ? '#F4E6C2' : melange(c.or, '#FFFFFF', .75),
    'or-reflet': c.or === DEF.or ? '#E6D3A3' : melange(c.or, '#FFFFFF', .5) });
  function cssTheme(c, pol = policesDe(null), taille = 'normal', tout = false) { // seules les valeurs changées sont écrites ; rien d'autre que @font-face locaux et --variable:valeur
    const d = derivees(c), lignes = [], faces = [];
    for (const x of COULEURS) if (tout || c[x.cle] !== DEF[x.cle]) {
      lignes.push(`--${x.cle}:${c[x.cle]};`);
      if (['bg', 'or', 'rouge'].includes(x.cle)) lignes.push(`--${x.cle}-rgb:${rgb(c[x.cle]).join(',')};`);
      if (x.cle === 'ligne') lignes.push(`--ligne2:${d.ligne2};`);
      if (x.cle === 'rouge') lignes.push(`--accent-clair:${d['accent-clair']};`);
      if (x.cle === 'or') lignes.push(`--or-clair:${d['or-clair']};`, `--or-pale:${d['or-pale']};`, `--or-reflet:${d['or-reflet']};`);
    }
    for (const r of ROLES) if (tout || pol[r.cle] !== r.def) { // police changée : son @font-face (si elle n'est pas déjà dans base.css) puis la variable
      const p = policeDe(pol[r.cle]);
      if (!p.base && !faces.some((f) => f.includes('"' + p.cle + '"'))) faces.push(`@font-face{font-family:"${p.cle}";font-weight:${p.poids};src:url("../polices/${p.fichier}.${p.ext || 'woff2'}") format("${DEPOT_POLICE.formats[p.ext || 'woff2']}");font-display:swap}`);
      lignes.push(`--${r.var}:"${p.cle}",${p.gen};`);
      if (r.cle === 'musique') lignes.push(`--musique-echelle:${p.h1};`);
    }
    if (tout || taille !== 'normal') lignes.push(`--echelle:${ECHELLES.find((e) => e.cle === taille).v};`);
    return ENTETE_CSS + faces.join('\n') + (faces.length ? '\n' : '') + (lignes.length ? ':root{\n' + lignes.join('\n') + '\n}\n' : '');
  }
  function problemesContraste(c) { // bloquant à la publication : le site doit rester lisible
    const d = derivees(c), p = [];
    const t = (a, b, min, msg) => { const v = contraste(a, b); if (v < min) p.push(`${msg} (contraste ${v.toFixed(1)}, il faut au moins ${min}).`); };
    t(c.ink, c.bg, 4.5, 'Le texte principal serait difficile à lire sur le fond');
    t(c.muted, c.bg, 4.5, 'Le texte discret serait difficile à lire sur le fond');
    t(c.ink, c.surface, 4.5, 'Le texte principal serait difficile à lire sur le fond des cartes');
    t(c.muted, c.surface, 4.5, 'Le texte discret serait difficile à lire sur le fond des cartes');
    t(c.or, c.bg, 3, "L'or serait difficile à voir sur le fond");
    t(c.rouge, c.bg, 2.5, 'Le rouge serait difficile à voir sur le fond');
    t(d['accent-clair'], c.bg, 4.5, 'Le texte en rouge clair (étiquettes) serait difficile à lire sur le fond');
    return p;
  }

  /* ---------- Outils ---------- */
  const S = { jeton: null, expire: null, docs: {}, base: {}, sha: {}, imgs: new Set(), staged: new Map(), annuler: null, brouillonOk: false };
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, attrs, ...enfants) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const c of enfants.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const lire = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };
  const dire = (txt, ms = 3500) => { const m = $('#messages'); m.replaceChildren(h('span', {}, txt)); clearTimeout(dire.t); dire.t = setTimeout(() => m.replaceChildren(), ms); };
  const slug = (s) => String(s || 'photo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo';
  const etiquette = (cle, sec) => {
    const t = ETIQ_SEC[sec], r = typeof t === 'function' ? t(cle) : t && t[cle];
    if (r) return r;
    return ETIQ[cle] || (cle.startsWith('aria_') ? "Description pour lecteurs d'écran" : cle.charAt(0).toUpperCase() + cle.slice(1).replace(/_h$/, ' (titre)').replace(/_/g, ' '));
  };
  const estObjet = (v) => v && typeof v === 'object' && !Array.isArray(v);

  class Erreur extends Error { constructor(msg, code) { super(msg); this.code = code; } }
  function dialogue(titre, corps, boutons) {
    return new Promise((ok) => {
      const fin = (v) => { fond.remove(); ok(v); };
      const fond = h('div', { class: 'fond', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'modale' }, h('h2', {}, titre), corps,
        h('div', { class: 'outils' }, boutons.map((b) => h('button', { class: b.primaire ? 'primaire' : '', onclick: () => fin(b.valeur) }, b.label)))));
      document.body.append(fond);
      const premier = $('button.primaire', fond) || $('button', fond); premier && premier.focus();
    });
  }
  const confirmer = (titre, texte, oui = 'Oui') => dialogue(titre, h('p', {}, texte), [{ label: 'Non', valeur: false }, { label: oui, valeur: true, primaire: true }]);

  /* ---------- API GitHub ---------- */
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const versB64 = (t) => b64(typeof t === 'string' ? new TextEncoder().encode(t) : t);
  const depuisB64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  async function gh(chemin, { method = 'GET', body } = {}) {
    let r;
    try {
      r = await fetch(API + chemin, { method, cache: 'no-store', body: body ? JSON.stringify(body) : undefined,
        headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + S.jeton, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) } });
    } catch { throw new Erreur("Pas de connexion à GitHub. Vérifie ta connexion internet et réessaie.", 'reseau'); }
    if (r.status === 204) return null;
    let data = null; try { data = await r.json(); } catch { /* corps vide */ }
    if (r.ok) return data;
    if (r.status === 401) throw new Erreur("Ton jeton n'est plus valable (expiré ou retiré). Il faut en créer un nouveau : ouvre l'Aide, étape « Renouveler le jeton ».", 'jeton');
    if (r.status === 403) throw new Erreur("GitHub refuse l'accès (le jeton n'a pas le droit d'écrire sur ce site, ou trop de demandes). Réessaie dans quelques minutes, sinon ouvre l'Aide.", 'droit');
    if (r.status === 404) { const e = new Erreur('Introuvable', 'absent'); throw e; }
    if (r.status === 409) throw new Erreur('Le site a changé pendant que tu modifiais. Recharge la page puis refais ta modification.', 'conflit');
    if (r.status === 422) throw new Erreur('GitHub a refusé cette demande (' + ((data && data.message) || 'erreur 422') + ').', 'refus');
    throw new Erreur('Erreur de GitHub (' + r.status + '). Réessaie plus tard.', 'autre');
  }
  const chemin = (p) => p.split('/').map(encodeURIComponent).join('/');
  async function lireFichier(p, ref = PRINCIPALE) {
    try { const f = await gh(`${R}/contents/${chemin(p)}?ref=${encodeURIComponent(ref)}`); return { texte: f.encoding === 'base64' ? depuisB64(f.content) : f.content, sha: f.sha }; }
    catch (e) { if (e.code === 'absent') return null; throw e; }
  }

  /* ---------- Données ---------- */
  function squelette(v) {
    if (typeof v === 'string') return null; if (typeof v === 'number') return 0; if (typeof v === 'boolean') return false; if (v == null) return null;
    if (Array.isArray(v)) return []; return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, squelette(x)]));
  }
  function aligner(fr, en) { // l'anglais reprend la forme du français (clés et nombre d'éléments)
    for (const [k, v] of Object.entries(fr)) {
      if (CACHES.has(k) && k !== 'n') continue;
      if (Array.isArray(v)) {
        const cles = [...new Set(v.flatMap((x) => (estObjet(x) ? Object.keys(x) : [])))]; // toutes les fiches d'une liste ont les mêmes champs (ex. une photo pour chaque offre)
        for (const x of v) if (estObjet(x)) for (const c of cles) if (!(c in x)) x[c] = squelette(v.find((y) => estObjet(y) && c in y)[c]);
        if (!Array.isArray(en[k])) en[k] = [];
        while (en[k].length < v.length) en[k].push(estObjet(v[0]) ? squelette(v[0]) : '');
        v.forEach((x, i) => { if (estObjet(x)) aligner(x, en[k][i]); });
      } else if (estObjet(v)) { if (!estObjet(en[k])) en[k] = {}; aligner(v, en[k]); }
      else if (!(k in en)) en[k] = squelette(v) ?? null;
    }
  }
  function nettoyer(v) { // '' devient null ; les lignes vides disparaissent des listes de textes
    if (Array.isArray(v)) { const a = v.map(nettoyer); return a.every((x) => typeof x === 'string' || x == null) ? a.filter((x) => x !== '' && x != null) : a; }
    if (estObjet(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, nettoyer(x)]));
    return v === '' ? null : v;
  }
  const ser = (k) => JSONS.includes(k) ? JSON.stringify(nettoyer(S.docs[k]), null, 2) + '\n' : String(S.docs[k] ?? '').replace(/\r\n/g, '\n').replace(/\s+$/, '') + (k.startsWith('bio') ? '\n' : '');
  const serBase = (k) => S.baseSer[k];
  // « Changé » = différence réelle de contenu : ajouter un champ resté vide ne compte pas (rien ne changerait sur le site).
  const sansNull = (v) => (Array.isArray(v) ? v.map(sansNull) : estObjet(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null).map(([k, x]) => [k, sansNull(x)])) : v);
  const eff = (k) => (JSONS.includes(k) ? JSON.stringify(sansNull(nettoyer(S.docs[k]))) : ser(k));
  const effBase = (k) => (JSONS.includes(k) ? JSON.stringify(sansNull(JSON.parse(S.baseSer[k]))) : S.baseSer[k]);
  const changes = () => Object.keys(FICHIERS).filter((k) => eff(k) !== effBase(k));

  async function charger() {
    const depot = await gh(R); S.tailleKo = depot.size || 0;
    if (depot.permissions && depot.permissions.push === false) throw new Erreur("Ce jeton peut lire le site mais pas le modifier. Il faut « Contents : Lecture et écriture » (voir l'Aide).", 'droit');
    S.docs = {}; S.baseSer = {}; S.sha = {};
    await Promise.all(Object.entries(FICHIERS).map(async ([k, p]) => {
      const f = await lireFichier(p);
      S.sha[k] = f ? f.sha : null;
      S.docs[k] = f ? (JSONS.includes(k) ? JSON.parse(f.texte) : f.texte) : (JSONS.includes(k) ? {} : '');
    }));
    aligner(S.docs.fr, S.docs.en);
    for (const k of Object.keys(FICHIERS)) S.baseSer[k] = ser(k);
    try { const l = await gh(`${R}/contents/img?ref=${PRINCIPALE}`); S.imgs = new Set(l.map((x) => x.name)); } catch { S.imgs = new Set(); }
    reprendreBrouillon();
  }
  function sauverBrouillon() {
    clearTimeout(sauverBrouillon.t);
    sauverBrouillon.t = setTimeout(() => ecrire('ov_brouillon', changes().length ? JSON.stringify({ sha: S.sha, docs: S.docs }) : null), 400);
  }
  function reprendreBrouillon() {
    const b = lire('ov_brouillon'); if (!b) return;
    try {
      const d = JSON.parse(b);
      const canon = (o) => JSON.stringify(Object.keys(FICHIERS).map((k) => (o || {})[k] ?? null)); // ordre fixe : les fichiers arrivent dans un ordre variable
      if (canon(d.sha) === canon(S.sha)) {
        S.docs = d.docs; S.brouillonOk = true; let perdues = 0; aligner(S.docs.fr, S.docs.en);
        (function oublier(o) { // les photos choisies mais jamais publiées ne survivent pas à un rechargement de la page
          if (Array.isArray(o)) o.forEach(oublier);
          else if (estObjet(o)) { if (o.image && !S.imgs.has(o.image)) { o.image = null; perdues++; } Object.values(o).forEach(oublier); }
        })([S.docs.fr, S.docs.en]);
        if (perdues) setTimeout(() => dire('Une photo non publiée a été perdue au rechargement : choisis-la à nouveau.', 8000), 300);
      }
      else { ecrire('ov_brouillon', null); setTimeout(() => dire("Le site a changé depuis ton dernier brouillon : il a été mis de côté.", 7000), 300); }
    } catch { ecrire('ov_brouillon', null); }
  }

  /* ---------- Parcours des textes (validation, résumé) ---------- */
  function aplatir(v, chem = [], sortie = {}) {
    if (Array.isArray(v)) v.forEach((x, i) => aplatir(x, [...chem, i], sortie));
    else if (estObjet(v)) for (const [k, x] of Object.entries(v)) { if (!CACHES.has(k) || k === 'n') aplatir(x, [...chem, k], sortie); }
    else sortie[JSON.stringify(chem)] = v;
    return sortie;
  }
  function nomChemin(fichier, chem) {
    const tete = fichier === 'fr' || fichier === 'en' ? (SECTION_NOM[chem[0]] || etiquette(String(chem[0]))) : fichier === 'liens' ? 'Liens' : 'Biographie';
    const parts = [tete]; let precedent = fichier === 'fr' || fichier === 'en' ? chem[0] : null;
    for (const c of chem.slice(1)) {
      if (typeof c === 'number') parts.push((NOM_ELEMENT[precedent] || 'Élément') + ' ' + (c + 1));
      else { parts.push(etiquette(c, chem[0])); precedent = c; }
    }
    return parts.join(' › ') + (fichier === 'en' ? ' (anglais)' : '');
  }
  function resumerChangements() {
    const lignes = [];
    for (const k of changes()) {
      if (k === 'theme') { // une ligne par couleur changée, avec son nom
        const a = couleursDe(JSON.parse(S.baseSer.theme)), b = couleursTheme();
        for (const x of COULEURS) if (a[x.cle] !== b[x.cle]) lignes.push({ txt: 'Apparence › ' + x.nom, type: 'modifié', avant: a[x.cle], apres: b[x.cle] });
        const pa = policesDe(JSON.parse(S.baseSer.theme)), pb = policesTheme();
        for (const r of ROLES) if (pa[r.cle] !== pb[r.cle]) lignes.push({ txt: 'Apparence › ' + r.nom, type: 'modifié', avant: pa[r.cle], apres: pb[r.cle] });
        const da = deposees(JSON.parse(S.baseSer.theme)).map((d) => d.nom), db = deposees().map((d) => d.nom);
        for (const n of db) if (!da.includes(n)) lignes.push({ txt: 'Apparence › Police ajoutée : ' + n, type: 'ajouté' });
        for (const n of da) if (!db.includes(n)) lignes.push({ txt: 'Apparence › Police retirée : ' + n, type: 'supprimé' });
        const ta = taillesDe(JSON.parse(S.baseSer.theme)), tb = tailleTheme(), nomE = (c) => ECHELLES.find((e) => e.cle === c).nom;
        if (ta !== tb) lignes.push({ txt: 'Apparence › Taille du texte', type: 'modifié', avant: nomE(ta), apres: nomE(tb) });
        continue;
      }
      if (!JSONS.includes(k)) { lignes.push({ txt: k === 'contacts' ? 'Liste des contacts voulus sur le site' : 'Biographie' + (k === 'bio-en' ? ' (anglais)' : ''), type: 'modifié' }); continue; }
      const avant = aplatir(JSON.parse(S.baseSer[k])), apres = aplatir(nettoyer(S.docs[k]));
      for (const c of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
        if (JSON.stringify(avant[c] ?? null) === JSON.stringify(apres[c] ?? null)) continue;
        const a = avant[c] ?? null, b = apres[c] ?? null, ch = JSON.parse(c);
        if (k === 'en' && PARTAGES.has(ch[ch.length - 1])) continue; // champs partagés : une seule ligne (côté français)
        lignes.push({ txt: nomChemin(k, ch), type: a == null ? 'ajouté' : b == null ? 'supprimé' : 'modifié', avant: a, apres: b });
      }
    }
    return lignes;
  }

  /* ---------- Contrôles avant publication ---------- */
  const normTel = (t) => t.replace(/\D/g, '').replace(/^(0033|33)([1-9])/, '0$2');
  function contactsAutorises() {
    return String(S.docs.contacts || '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split('|')[0].trim());
  }
  function trouverContacts(texte) {
    const t = String(texte), sortie = [];
    const auto = contactsAutorises(), autoMail = auto.map((x) => x.toLowerCase()), autoTel = auto.map(normTel);
    for (const m of t.match(RE_MAIL) || []) if (!autoMail.includes(m.toLowerCase())) sortie.push({ type: 'e-mail', valeur: m });
    for (const m of t.matchAll(RE_TEL)) { const v = m[2]; if (!autoTel.includes(normTel(v))) sortie.push({ type: 'téléphone', valeur: v.trim() }); }
    return sortie;
  }
  function controler() {
    const erreurs = [], avert = [], contacts = new Map();
    const textes = [];
    for (const k of Object.keys(FICHIERS)) {
      if (k === 'contacts') continue;
      if (JSONS.includes(k)) for (const [c, v] of Object.entries(aplatir(nettoyer(S.docs[k])))) { if (typeof v === 'string') textes.push({ k, ch: JSON.parse(c), v }); }
      else textes.push({ k, ch: [], v: String(S.docs[k]) });
    }
    for (const { k, ch, v } of textes) {
      const nom = nomChemin(k, ch);
      if (/<\/?[a-zA-Z!]/.test(v)) erreurs.push(`${nom} : les signes < > ne sont pas permis (ils ressemblent à du code). Retire-les.`);
      if (v.length > MAX_TEXTE) erreurs.push(`${nom} : texte trop long (${v.length} caractères, maximum ${MAX_TEXTE}).`);
      if (RE_SECRET.test(v) || RE_JETON.test(v)) erreurs.push(`${nom} : ça ressemble à un mot de passe ou à une clé secrète. Ne le mets jamais sur le site : retire-le.`);
      if (k !== 'liens') for (const c of trouverContacts(v)) contacts.set(c.valeur, c);
    }
    for (const k of ['fr', 'en']) {
      (function parcourir(o, ch) {
        if (Array.isArray(o)) o.forEach((x, i) => parcourir(x, [...ch, i]));
        else if (estObjet(o)) {
          for (const cle of ['titre', 'h']) if (k === 'fr' && cle in o && !(o[cle] || '').trim()) erreurs.push(`${nomChemin(k, [...ch, cle])} : le titre ne peut pas être vide.`);
          if (k === 'fr' && typeof ch[ch.length - 1] === 'number' && o.billets && !/^https:\/\/\S+$/.test(o.billets)) erreurs.push(`${nomChemin(k, [...ch, 'billets'])} : l'adresse doit commencer par https://`);
          if (k === 'fr' && typeof ch[ch.length - 1] === 'number' && 'youtube' in o && o.youtube && !/^[\w-]{11}$/.test(o.youtube)) erreurs.push(`${nomChemin(k, [...ch, 'youtube'])} : colle l'adresse de la vidéo YouTube (ou ses 11 caractères).`);
          if (k === 'fr' && o.image && !S.imgs.has(o.image) && !S.staged.has('img/' + o.image)) erreurs.push(`${nomChemin(k, [...ch, 'image'])} : cette photo n'est plus disponible, choisis-la à nouveau.`);
          if (k === 'fr' && o.image && !(o.image_alt || '').trim()) erreurs.push(`${nomChemin(k, [...ch, 'image_alt'])} : décris la photo en une phrase.`);
          if (o.lien && 'image' in o && !(o.lien in S.docs.liens)) erreurs.push(`${nomChemin(k, [...ch, 'lien'])} : ce lien n'existe pas dans la page « Liens ».`);
          for (const [c, x] of Object.entries(o)) if (!CACHES.has(c)) parcourir(x, [...ch, c]);
        }
      })(S.docs[k], []);
    }
    (S.docs.liens.reseaux || []).forEach((r, i) => {
      if ((r.nom || r.url) && !((r.nom || '').trim() && /^https:\/\/\S+$/.test(r.url || ''))) erreurs.push(`Liens › Autres réseaux › Réseau ${i + 1} : il faut un nom ET une adresse qui commence par https://`);
    });
    for (const [c, v] of Object.entries(S.docs.liens)) {
      if (c.startsWith('_') || Array.isArray(v) || v == null || v === '') continue;
      if (c === 'youtube') { if (!/^[\w-]{11}$/.test(v) && !/^https:\/\/\S+$/.test(v)) erreurs.push("Liens › YouTube (page Musique) : colle l'adresse complète (https://…)."); }
      else if (c.startsWith('youtube')) { if (!/^[\w-]{11}$/.test(v)) erreurs.push(`Liens › ${LIENS_ETIQ[c] || c} : l'identifiant YouTube a 11 caractères (la fin de l'adresse après « v= »).`); }
      else if (!['dates_concert', 'lieu_concert'].includes(c) && !/^https:\/\/\S+$/.test(v)) erreurs.push(`Liens › ${LIENS_ETIQ[c] || c} : l'adresse doit commencer par https://`);
    }
    const th = (S.docs.theme && S.docs.theme.couleurs) || {};
    for (const x of COULEURS) if (th[x.cle] != null && !HEX.test(th[x.cle])) erreurs.push(`Apparence › ${x.nom} : code de couleur invalide (il faut # puis 6 chiffres ou lettres A à F, par exemple #B8975A).`);
    const tp = (S.docs.theme && S.docs.theme.polices) || {};
    for (const r of ROLES) if (tp[r.cle] != null && !policeDe(tp[r.cle])) erreurs.push(`Apparence › ${r.nom} : cette police n'est pas dans le catalogue.`);
    for (const r of ROLES) if (r.texte && policeDe(policesTheme()[r.cle]) && !policeDe(policesTheme()[r.cle]).texte) erreurs.push(`Apparence › ${r.nom} : cette police n'a pas les épaisseurs nécessaires au texte courant ; choisis-en une autre.`);
    const baseD = deposees(JSON.parse(S.baseSer.theme)).map((d) => d.fichier);
    for (const d of deposees()) {
      if (d.licence !== true) erreurs.push(`Apparence › Police « ${d.nom} » : il faut confirmer que tu as le droit de l'utiliser.`);
      if (!S.staged.has('polices/' + d.fichier) && !baseD.includes(d.fichier)) erreurs.push(`Apparence › Police « ${d.nom} » : le fichier n'est plus disponible, ajoute-la à nouveau.`);
    }
    if (deposees().length > DEPOT_POLICE.max) erreurs.push('Apparence : trop de polices ajoutées (maximum ' + DEPOT_POLICE.max + ').');
    if (S.docs.theme && S.docs.theme.taille != null && !ECHELLES.some((e) => e.cle === S.docs.theme.taille)) erreurs.push('Apparence › Taille du texte : valeur inconnue.');
    if (!erreurs.some((e) => e.startsWith('Apparence'))) for (const m of problemesContraste(couleursTheme())) erreurs.push('Apparence : ' + m);
    // traductions manquantes (non bloquant)
    let manque = 0;
    const flFr = aplatir(nettoyer(S.docs.fr)), flEn = aplatir(nettoyer(S.docs.en));
    for (const [c, v] of Object.entries(flFr)) if (typeof v === 'string' && v && !PARTAGES.has(JSON.parse(c).slice(-1)[0]) && !(flEn[c])) manque++;
    if (manque) avert.push(`${manque} texte(s) n'ont pas encore de version anglaise (tu peux publier quand même, la page anglaise affichera un vide).`);
    return { erreurs, avert, contacts: [...contacts.values()] };
  }

  /* ---------- Formulaires ---------- */
  let rendu = null; // fonction qui redessine l'écran courant
  function modifie() { sauverBrouillon(); majBarre(); }
  function champTexte(valeur, long, onchange, id) {
    const a = h(long ? 'textarea' : 'input', long ? { id, rows: 2 } : { id, type: 'text' });
    a.value = valeur == null ? '' : String(valeur);
    const ajuster = () => { if (long) { a.style.height = 'auto'; a.style.height = Math.min(a.scrollHeight + 4, 600) + 'px'; } };
    a.addEventListener('input', () => { onchange(a.value); ajuster(); modifie(); });
    queueMicrotask(ajuster); setTimeout(ajuster, 50);
    return a;
  }
  let idn = 0;
  function renumeroter(arr) { arr.forEach((x, i) => { if (estObjet(x) && 'n' in x) x.n = i + 1; }); }

  function rendreObjet(conteneur, fr, en, chem, seulement) {
    for (const [cle, v] of Object.entries(fr)) {
      if (CACHES.has(cle) || (seulement && !seulement.includes(cle))) continue;
      const nom = etiquette(cle, chem[0]);
      if (Array.isArray(v)) { conteneur.append(rendreListe(cle, fr, en, chem, nom)); continue; }
      if (estObjet(v)) { conteneur.append(h('h4', { class: 'sous' }, nom)); const g = h('div', {}); rendreObjet(g, v, en[cle], [...chem, cle]); conteneur.append(g); continue; }
      if (cle === 'image') { conteneur.append(rendrePhoto(fr, en)); continue; }
      if (cle === 'lien' && 'image' in fr && 'infos' in fr) { conteneur.append(rendreVideo(fr, en)); continue; } // film : on colle l'adresse YouTube
      if (cle === 'lien' && 'image' in fr) { conteneur.append(rendreLien(fr, en)); continue; } // « lien » = clé de la page Liens (livres, films) ; ailleurs c'est un texte
      if (typeof v === 'boolean' || cle === 'instrumental' || cle === 'paysage') { conteneur.append(rendreCase(cle, fr, en, nom)); continue; }
      if (PARTAGES.has(cle) && cle !== 'lien') { // champ partagé (ex. date) : un seul champ, écrit dans les deux langues
        const id = 'c' + (++idn), champ = champTexte(fr[cle], false, (x) => { fr[cle] = x; en[cle] = x; }, id);
        if (cle === 'youtube') champ.addEventListener('change', () => { const y = idYoutube(champ.value); if (y) { champ.value = y; fr[cle] = y; en[cle] = y; modifie(); } }); // adresse complète acceptée
        conteneur.append(h('label', { for: id }, nom), champ); continue;
      }
      const long = LONGS.has(cle) || String(fr[cle] ?? '').length > 70 || String(en[cle] ?? '').length > 70;
      const id = 'c' + (++idn);
      conteneur.append(h('label', { for: id + 'f' }, nom),
        h('div', { class: 'duo deux' },
          h('div', {}, h('p', { class: 'langue' }, 'Français'), champTexte(fr[cle], long, (x) => { fr[cle] = x; }, id + 'f')),
          h('div', {}, h('p', { class: 'langue' }, 'English'), champTexte(en[cle], long, (x) => { en[cle] = x; }, id + 'e'))));
    }
  }
  function rendreCase(cle, fr, en, nom) {
    const c = h('input', { type: 'checkbox' }); c.checked = !!fr[cle];
    c.addEventListener('change', () => { fr[cle] = c.checked; en[cle] = c.checked; modifie(); });
    return h('label', { style: 'display:flex;gap:.6rem;align-items:center;font-weight:600' }, c, nom);
  }
  function rendreLien(fr, en) {
    const sel = h('select', {}, h('option', { value: '' }, '(aucun lien)'), ...Object.keys(S.docs.liens).filter((k) => !k.startsWith('_')).map((k) => h('option', { value: k }, LIENS_ETIQ[k] || k)));
    sel.value = fr.lien || '';
    sel.addEventListener('change', () => { fr.lien = sel.value || null; en.lien = sel.value || null; modifie(); });
    return h('div', {}, h('label', {}, 'Lien associé'), sel, h('p', { class: 'doux' }, "L'adresse elle-même se règle dans la page « Liens »."));
  }
  function rendreVideo(fr, en) { // vidéo YouTube d'un film : l'éditeur crée tout seul le lien dans la page « Liens »
    const L = S.docs.liens, id = 'c' + (++idn);
    const champ = champTexte(fr.lien && L[fr.lien] ? L[fr.lien] : '', false, () => {}, id);
    champ.placeholder = 'Colle ici l\'adresse de la vidéo YouTube';
    const appliquer = () => {
      const v = idYoutube(champ.value) || champ.value.trim();
      if (!v) { fr.lien = null; en.lien = null; modifie(); return; }
      let cle = fr.lien; if (!cle) { cle = 'youtube_' + slug(fr.titre || 'film').replace(/-/g, '_'); while (cle in L && L[cle]) cle += '_2'; }
      L[cle] = v; fr.lien = cle; en.lien = cle; LIENS_ETIQ[cle] = 'YouTube : ' + (fr.titre || 'film'); champ.value = v; modifie();
    };
    champ.addEventListener('input', appliquer);
    return h('div', {}, h('label', { for: id }, 'Vidéo YouTube de ce film'), champ, h('p', { class: 'doux' }, 'Laisse vide s\'il n\'y a pas encore de vidéo : aucun bouton ne s\'affiche. Sinon un bouton « YouTube » apparaît sous le texte.'));
  }
  function urlPhoto(nom) { const f = S.staged.get('img/' + nom); return f ? f.url : '../img/' + encodeURIComponent(nom); }
  function rendrePhoto(fr, en) {
    const zone = h('div', { class: 'photo' });
    const fichier = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const dessiner = () => {
      zone.replaceChildren(
        fr.image ? h('img', { src: urlPhoto(fr.image), alt: '' }) : h('div', { class: 'doux' }, 'Pas de photo'),
        h('div', { class: 'outils' },
          h('button', { class: 'petit', onclick: () => fichier.click() }, fr.image ? 'Changer la photo' : 'Choisir une photo'),
          fr.image && h('button', { class: 'petit danger', onclick: () => { fr.image = null; en.image = null; dessiner(); modifie(); } }, 'Retirer la photo')));
    };
    fichier.addEventListener('change', async () => {
      const f = fichier.files[0]; if (!f) return;
      try {
        dire('Préparation de la photo…');
        const { blob, url } = await reduirePhoto(f);
        const base = slug(fr.titre || en.titre || 'photo'); let nom = base + '.webp', i = 2;
        while (S.imgs.has(nom) || S.staged.has('img/' + nom)) nom = `${base}-${i++}.webp`;
        S.staged.set('img/' + nom, { blob, url }); fr.image = nom; en.image = nom; dessiner(); modifie(); dire('Photo prête.');
      } catch (e) { dire("Cette photo n'a pas pu être lue. Essaie une autre photo.", 6000); }
    });
    dessiner();
    return h('div', {}, h('label', {}, 'Photo'), zone, fichier);
  }
  async function reduirePhoto(fichier) {
    const bmp = await createImageBitmap(fichier);
    const max = 1600, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const encoder = (q) => new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('image'))), 'image/webp', q));
    let blob = await encoder(0.85);
    for (let q = 0.7; blob.size > 1.5e6 && q >= 0.4; q -= 0.15) blob = await encoder(q); // une photo ne dépasse pas 1,5 Mo : le dépôt reste léger pendant des années
    return { blob, url: URL.createObjectURL(blob) };
  }

  function rendreListe(cle, fr, en, chem, nom) {
    const arrFr = fr[cle], arrEn = en[cle], noun = NOM_ELEMENT[cle] || 'Élément';
    const texte = !arrFr.some(estObjet) && !MODELES[cle];
    const bloc = h('section', {}, h('h4', { class: 'sous' }, nom));
    const redessiner = () => { renumeroter(arrFr); renumeroter(arrEn); const y = scrollY; rendu && rendu(); scrollTo(0, y); };
    const outils = (i) => h('div', { class: 'outils' },
      h('button', { class: 'petit', disabled: i === 0, onclick: () => { [arrFr[i - 1], arrFr[i]] = [arrFr[i], arrFr[i - 1]]; [arrEn[i - 1], arrEn[i]] = [arrEn[i], arrEn[i - 1]]; modifie(); redessiner(); } }, '↑ Monter'),
      h('button', { class: 'petit', disabled: i === arrFr.length - 1, onclick: () => { [arrFr[i + 1], arrFr[i]] = [arrFr[i], arrFr[i + 1]]; [arrEn[i + 1], arrEn[i]] = [arrEn[i], arrEn[i + 1]]; modifie(); redessiner(); } }, '↓ Descendre'),
      h('button', { class: 'petit danger', onclick: async () => { if (await confirmer(`Supprimer ${noun.toLowerCase() === 'étape' ? 'cette' : 'ce'} ${noun.toLowerCase()} ?`, "Rien n'est publié tant que tu ne publies pas : tu peux revenir en arrière avec « Remettre comme en ligne ».", 'Supprimer')) { arrFr.splice(i, 1); arrEn.splice(i, 1); modifie(); redessiner(); } } }, 'Supprimer'));
    arrFr.forEach((x, i) => {
      if (texte) {
        const id = 'c' + (++idn);
        bloc.append(h('div', { class: 'carte' }, h('label', { for: id + 'f' }, `${noun} ${i + 1}`),
          h('div', { class: 'duo deux' },
            h('div', {}, h('p', { class: 'langue' }, 'Français'), champTexte(arrFr[i], true, (v) => { arrFr[i] = v; }, id + 'f')),
            h('div', {}, h('p', { class: 'langue' }, 'English'), champTexte(arrEn[i], true, (v) => { arrEn[i] = v; }, id + 'e'))), outils(i)));
      } else {
        const titre = x.titre || x.h || (x.date ? `${x.date} : ${x.texte || x.lieu || ''}` : '') || x.lieu || `${noun} ${i + 1}`;
        const d = h('details', { class: 'carte', open: arrFr.length <= 3 }, h('summary', {}, `${noun} ${i + 1} : ${String(titre).slice(0, 60)}`));
        const g = h('div', {}); rendreObjet(g, x, arrEn[i], [...chem, cle, i]); d.append(g, outils(i)); bloc.append(d);
      }
    });
    bloc.append(h('div', { class: 'outils' }, h('button', { onclick: () => {
      const modeleFr = texte ? '' : squelette(arrFr[0] || MODELES[cle] || {}), modeleEn = texte ? '' : clone(modeleFr);
      if (!texte) { for (const o of [modeleFr, modeleEn]) for (const [k, v] of Object.entries(o)) { if (Array.isArray(v)) o[k] = []; if (typeof arrFr[0]?.[k] === 'boolean') o[k] = false; } }
      arrFr.push(modeleFr); arrEn.push(modeleEn); modifie(); redessiner();
    } }, `+ Ajouter ${/^[aeiouéèh]/i.test(noun) ? 'une' : 'un'} ${noun.toLowerCase()}`)));
    return bloc;
  }

  function ecranSection(sec) {
    rendu = () => ecranSection(sec);
    const main = $('#ecran'); main.replaceChildren();
    main.append(h('button', { onclick: () => montrer('accueil') }, '← Retour au menu'), h('h2', {}, sec.titre));
    if (sec.special === 'liens') {
      const L = S.docs.liens;
      for (const k of Object.keys(L)) {
        if (k.startsWith('_') || Array.isArray(L[k])) continue;
        const id = 'c' + (++idn);
        const champ = champTexte(L[k], false, (v) => { L[k] = v || null; }, id);
        if (k.startsWith('youtube_')) champ.addEventListener('change', () => { const y = idYoutube(champ.value); if (y) { champ.value = y; L[k] = y; modifie(); } }); // adresse complète acceptée
        main.append(h('label', { for: id }, LIENS_ETIQ[k] || etiquette(k)), champ);
      }
      main.append(h('p', { class: 'doux' }, 'Laisse vide si tu n\'as pas encore le lien : le site affichera « Bientôt » ou ne montrera rien. Pour AJOUTER un autre lien (TikTok, un site…), descends au bloc « Autres réseaux » juste en dessous.'));
      // Autres réseaux : chacun apparaît en bas de toutes les pages dès qu'il a un nom ET une adresse
      if (!Array.isArray(L.reseaux)) L.reseaux = [];
      main.append(h('h3', { class: 'bloc' }, 'Autres réseaux (affichés en bas de toutes les pages)'));
      L.reseaux.forEach((r, i) => {
        const id = 'r' + (++idn);
        main.append(h('div', { class: 'carte' }, h('label', { for: id + 'n' }, 'Nom du réseau (ex : TikTok)'), champTexte(r.nom, false, (v) => { r.nom = v; }, id + 'n'),
          h('label', { for: id + 'u' }, 'Adresse de ta page (https://…)'), champTexte(r.url, false, (v) => { r.url = v; }, id + 'u'),
          h('div', { class: 'outils' }, h('button', { class: 'petit danger', onclick: async () => { if (await confirmer('Supprimer ce réseau ?', 'Il disparaîtra du bas des pages quand tu publieras.', 'Supprimer')) { L.reseaux.splice(i, 1); modifie(); rendu(); } } }, 'Supprimer'))));
      });
      main.append(h('div', { class: 'outils' }, h('button', { onclick: () => { L.reseaux.push({ nom: null, url: null }); modifie(); rendu(); } }, '+ Ajouter un lien (réseau, site…)')));
    } else if (sec.special === 'apparence') {
      rendreApparence(main);
    } else if (sec.special === 'bio') {
      main.append(h('p', { class: 'doux' }, 'Un paragraphe = un bloc, séparé du suivant par une ligne vide.'),
        h('div', { class: 'duo deux' },
          h('div', {}, h('p', { class: 'langue' }, 'Français'), champTexte(S.docs['bio-fr'], true, (v) => { S.docs['bio-fr'] = v; }, 'bio-fr')),
          h('div', {}, h('p', { class: 'langue' }, 'English'), champTexte(S.docs['bio-en'], true, (v) => { S.docs['bio-en'] = v; }, 'bio-en'))));
    } else {
      for (const cle of sec.cles) {
        const fr = S.docs.fr[cle], en = S.docs.en[cle], blocs = (BLOCS[cle] || [{ titre: SECTION_NOM[cle] || etiquette(cle), cles: null }]).slice();
        const connus = new Set(blocs.flatMap((b) => b.cles || [])), reste = Object.keys(fr).filter((k) => !connus.has(k) && !CACHES.has(k));
        if (BLOCS[cle] && reste.length && !blocs.some((b) => !b.cles)) blocs.push({ titre: 'Autres réglages', cles: reste });
        for (const b of blocs) { main.append(h('h3', { class: 'bloc' }, b.titre)); const g = h('div', {}); rendreObjet(g, fr, en, [cle], b.cles); main.append(g); }
      }
    }
    main.append(h('div', { class: 'outils', style: 'margin-top:2rem' }, h('button', { class: 'danger', onclick: async () => {
      if (!(await confirmer('Remettre comme en ligne ?', 'Tes modifications non publiées de cette page seront effacées.', 'Remettre'))) return;
      const cles = sec.special === 'liens' ? ['liens'] : sec.special === 'apparence' ? ['theme'] : sec.special === 'bio' ? ['bio-fr', 'bio-en'] : null;
      if (cles) cles.forEach((k) => { S.docs[k] = JSONS.includes(k) ? JSON.parse(S.baseSer[k]) : S.baseSer[k]; });
      else { const fr = JSON.parse(S.baseSer.fr), en = JSON.parse(S.baseSer.en); for (const c of sec.cles) { S.docs.fr[c] = fr[c]; S.docs.en[c] = en[c]; } }
      modifie(); rendu();
    } }, 'Remettre cette page comme en ligne')));
    barre([{ label: 'Menu', fn: () => montrer('accueil') }, { label: 'Voir ce que je publie', primaire: true, fn: () => montrer('publier') }]);
  }

  /* ---------- Écrans ---------- */
  function barre(boutons) {
    $('.barre') && $('.barre').remove();
    if (!boutons) return;
    document.body.append(h('div', { class: 'barre' }, boutons.map((b) => h('button', { class: b.primaire ? 'primaire' : '', onclick: b.fn, disabled: !!b.off }, b.label))));
  }
  function majBarre() { /* le décompte se met à jour au retour au menu */ }
  function compteSection(sec) {
    if (sec.special === 'liens') return eff('liens') !== effBase('liens') ? 1 : 0;
    if (sec.special === 'apparence') return eff('theme') !== effBase('theme') ? 1 : 0;
    if (sec.special === 'bio') return ['bio-fr', 'bio-en'].filter((k) => eff(k) !== effBase(k)).length;
    let n = 0; const a = JSON.parse(S.baseSer.fr), b = JSON.parse(S.baseSer.en);
    for (const c of sec.cles) {
      n +=diffCompte(a[c], nettoyer(S.docs.fr)[c]) + diffCompte(b[c], nettoyer(S.docs.en)[c]);
    }
    return n;
  }
  const diffCompte = (a, b) => { const x = aplatir(a ?? {}), y = aplatir(b ?? {}); let n = 0; for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[k] ?? null) !== JSON.stringify(y[k] ?? null)) n++; return n; };

  function fixerCouleur(cle, valeur) { // ne garde dans theme.json que les couleurs différentes de l'origine
    const T = S.docs.theme = estObjet(S.docs.theme) ? S.docs.theme : {};
    const c = estObjet(T.couleurs) ? T.couleurs : {};
    if (HEX.test(valeur) && valeur.toUpperCase() === DEF[cle]) delete c[cle]; else c[cle] = valeur;
    if (Object.keys(c).length) T.couleurs = c; else delete T.couleurs;
  }
  const cssApercu = () => { // thème complet en cours d'édition, pour le cadre d'aperçu (jamais publié)
    let c = cssTheme(couleursTheme(), policesTheme(), tailleTheme(), true).replace(/\.\.\/polices\//g, new URL('../polices/', location.href).pathname);
    for (const [p, f] of S.staged) if (p.startsWith('polices/')) c = c.split('url("' + new URL('../' + p, location.href).pathname + '"').join('url("' + f.url + '"'); // police ajoutée mais pas encore publiée
    return c;
  };
  function fixerPolice(cle, valeur) { // ne garde dans theme.json que les polices différentes de l'origine
    const T = S.docs.theme = estObjet(S.docs.theme) ? S.docs.theme : {};
    const p = estObjet(T.polices) ? T.polices : {}, r = ROLES.find((x) => x.cle === cle);
    if (valeur === r.def) delete p[cle]; else p[cle] = valeur;
    if (Object.keys(p).length) T.polices = p; else delete T.polices;
  }
  function fixerTaille(cle) { const T = S.docs.theme = estObjet(S.docs.theme) ? S.docs.theme : {}; if (cle === 'normal') delete T.taille; else T.taille = cle; }
  const chargees = new Set();
  function chargerPolice(cle) { // aperçu dans l'éditeur : charge le fichier du catalogue (police locale, jamais distante)
    const p = policeDe(cle);
    if (!p || chargees.has(cle) || typeof FontFace === 'undefined') return;
    chargees.add(cle);
    const st = S.staged.get('polices/' + p.fichier + '.' + (p.ext || 'woff2'));
    const src = st ? st.blob.arrayBuffer() : Promise.resolve(`url("../polices/${p.fichier}.${p.ext || 'woff2'}")`);
    src.then((x) => new FontFace(p.cle, x, { weight: p.poids }).load()).then((x) => document.fonts.add(x)).catch(() => chargees.delete(cle));
  }
  const OCTETS_FONTE = { woff2: [0x77, 0x4f, 0x46, 0x32], woff: [0x77, 0x4f, 0x46, 0x46], otf: [0x4f, 0x54, 0x54, 0x4f] }; // ttf : 00 01 00 00 ou « true »
  const fonteValide = (ext, o) => (ext === 'ttf' ? (o[0] === 0 && o[1] === 1 && o[2] === 0 && o[3] === 0) || [0x74, 0x72, 0x75, 0x65].every((v, i) => o[i] === v) : OCTETS_FONTE[ext].every((v, i) => o[i] === v));
  function depotPolice() { // « Ajouter ma police » : fichier, nom, licence cochée ; rangée dans polices/depot-<nom>.<format>
    const fic = h('input', { type: 'file', id: 'depot-fichier', accept: '.woff2,.woff,.ttf,.otf', 'aria-label': 'Fichier de police' });
    const nom = h('input', { type: 'text', id: 'depot-nom', maxlength: '40', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Nom de la police' });
    const licence = h('input', { type: 'checkbox', id: 'depot-licence' }), msg = h('p', { id: 'depot-msg', role: 'status' });
    const dire2 = (t, ok) => { msg.className = ok ? 'ok' : 'erreur'; msg.textContent = t; };
    fic.addEventListener('change', () => { const f = fic.files[0]; if (f && !nom.value) nom.value = f.name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40); });
    const ajouter = async () => {
      const f = fic.files[0]; if (!f) return dire2('Choisis d\'abord le fichier de la police.');
      const ext = (f.name.match(/\.([A-Za-z0-9]+)$/) || [])[1]; const e = ext && ext.toLowerCase();
      if (!DEPOT_POLICE.formats[e]) return dire2('Ce type de fichier n\'est pas accepté : il faut .woff2, .woff, .ttf ou .otf.');
      if (f.size > DEPOT_POLICE.octets) return dire2(`Ce fichier pèse ${Math.round(f.size / 1024)} Ko : le maximum est ${DEPOT_POLICE.octets / 1024} Ko. Cherche une version plus légère (.woff2 de préférence).`);
      const o = new Uint8Array(await f.slice(0, 4).arrayBuffer());
      if (!fonteValide(e, o)) return dire2('Ce fichier ne ressemble pas à une vraie police : il est refusé.');
      const n = nom.value.replace(/\s+/g, ' ').trim();
      if (!/^[A-Za-z0-9 ]{2,40}$/.test(n)) return dire2('Le nom de la police : 2 à 40 lettres, chiffres ou espaces (sans accent).');
      if (toutesPolices().some((p) => p.cle.toLowerCase() === n.toLowerCase())) return dire2('Une police porte déjà ce nom : choisis un autre nom.');
      if (deposees().length >= DEPOT_POLICE.max) return dire2(`Tu as déjà ${DEPOT_POLICE.max} polices ajoutées : retires-en une d'abord.`);
      if (!licence.checked) return dire2('Coche la case : tu confirmes avoir le droit d\'utiliser cette police sur ton site.');
      const slug = n.toLowerCase().replace(/ /g, '-'), fichier = `depot-${slug}.${e}`;
      S.staged.set('polices/' + fichier, { blob: f, url: URL.createObjectURL(f) });
      const T = S.docs.theme = estObjet(S.docs.theme) ? S.docs.theme : {};
      T.polices_deposees = [...deposees(T), { nom: n, fichier, licence: true }];
      modifie(); rendu();
    };
    const liste = deposees().map((d) => h('li', {}, d.nom + ' ', h('button', { class: 'petit', onclick: () => {
      const T = S.docs.theme; T.polices_deposees = deposees(T).filter((x) => x.nom !== d.nom); if (!T.polices_deposees.length) delete T.polices_deposees;
      for (const r of ROLES) if (T.polices && T.polices[r.cle] === d.nom) fixerPolice(r.cle, r.def); // un rôle qui l'utilisait revient à la police d'origine
      S.staged.delete('polices/' + d.fichier); modifie(); rendu();
    } }, 'Retirer')));
    return h('details', { class: 'carte', id: 'depot-police' }, h('summary', {}, 'Ajouter une police à moi'),
      h('p', { class: 'doux' }, `Pour une police qui n'est pas dans le catalogue. Format .woff2 de préférence (.woff, .ttf, .otf acceptés), ${DEPOT_POLICE.octets / 1024} Ko au maximum, ${DEPOT_POLICE.max} polices au plus. Elle sera copiée sur le site et se choisira ensuite dans les listes ci-dessus.`),
      liste.length ? h('ul', { class: 'liste' }, liste) : null,
      h('label', { for: 'depot-fichier' }, 'Fichier de la police'), fic,
      h('label', { for: 'depot-nom' }, 'Nom à afficher (sans accent)'), nom,
      h('label', { for: 'depot-licence' }, licence, " J'ai le droit d'utiliser cette police sur mon site (licence libre ou achetée)."),
      h('div', { class: 'outils' }, h('button', { onclick: ajouter }, 'Ajouter cette police')), msg);
  }
  function rendreApparence(main) {
    main.append(h('p', {}, "Choisis les couleurs, les polices et la taille du texte du site. Les dessins (ange, symboles) gardent leur forme ; seules leurs couleurs suivent. Rien ne change sur le site tant que tu n'as pas publié."));
    const apercu = h('div', { class: 'carte', id: 'apercu-theme' }), etat = h('div', { id: 'etat-theme' }), champs = [];
    let rafraichir = () => {};
    const pages = [['Accueil', '../'], ['Musique', '../rvl/'], ['Écriture', '../ecriture/'], ['Audiovisuel', '../audiovisuel/'], ['Services', '../services/'], ['Oriana', '../oriana/']];
    const choixPage = h('select', { id: 'apercu-page', 'aria-label': 'Page à voir' }, pages.map(([n, u]) => h('option', { value: u }, n)));
    const choixMode = h('select', { id: 'apercu-mode', 'aria-label': "Taille de l'écran" }, h('option', { value: 'tel' }, 'Téléphone'), h('option', { value: 'ordi' }, 'Ordinateur'));
    const cadre = h('div', { class: 'apercu-cadre' }), vue = h('iframe', { name: 'apercu-oriana', title: 'Aperçu du site', id: 'apercu-site' });
    cadre.append(vue);
    const dimension = () => {
      const tel = choixMode.value === 'tel', w = tel ? 390 : 1280, hh = tel ? 780 : 800, k = Math.min(1, (cadre.clientWidth || 340) / w);
      vue.style.setProperty('width', w + 'px'); vue.style.setProperty('height', hh + 'px'); vue.style.setProperty('transform', 'scale(' + k + ')'); cadre.style.setProperty('height', Math.round(hh * k) + 'px');
    };
    let minuterie; rafraichir = () => { // l'aperçu suit chaque réglage, sans rien publier
      clearTimeout(minuterie);
      minuterie = setTimeout(() => {
        if (!vue.isConnected) return;
        dimension();
        try { sessionStorage.setItem('apercu_theme', cssApercu()); } catch (_) { /* aperçu sans effet si le stockage est refusé */ }
        if (vue.getAttribute('src') !== choixPage.value) vue.setAttribute('src', choixPage.value); else if (vue.contentWindow) vue.contentWindow.location.reload();
      }, 450);
    };
    choixPage.addEventListener('change', rafraichir); choixMode.addEventListener('change', rafraichir); addEventListener('resize', () => { if (vue.isConnected) dimension(); });
    const widget = h('div', {}, h('h2', {}, 'Aperçu du site'), h('p', { class: 'doux' }, "Le vrai site avec tes réglages, avant de publier. Il se met à jour à chaque changement (ça peut prendre une seconde)."), h('div', { class: 'outils' }, choixPage, choixMode), cadre);
    const maj = () => {
      const c = couleursTheme(), p = problemesContraste(c);
      apercu.replaceChildren(h('strong', {}, 'Oriana Valenza'), h('p', {}, 'Texte principal : voici à quoi ressemblera ton site.'), h('p', {}, 'Texte discret : sous-titres et légendes.'),
        h('div', {}, 'Une carte (livre, offre)'), h('span', {}, 'Or'), ' · ', h('span', {}, 'Rouge'));
      const [t, tp, tm, carte, o, , r] = apercu.childNodes, st = (e, k, v) => e.style.setProperty(k, v);
      st(apercu, 'background', c.bg); st(apercu, 'border', '1px solid ' + c.ligne); st(apercu, 'padding', '1rem'); st(t, 'color', c.ink); st(t, 'font-size', '1.3rem'); st(tp, 'color', c.ink); st(tm, 'color', c.muted);
      st(carte, 'background', c.surface); st(carte, 'color', c.ink); st(carte, 'border', '1px solid ' + c.ligne); st(carte, 'padding', '.6rem'); st(carte, 'border-radius', '.5rem'); st(carte, 'margin', '.5rem 0');
      st(o, 'color', c.or); st(o, 'font-weight', '700'); st(r, 'color', c.rouge); st(r, 'font-weight', '700');
      etat.replaceChildren(p.length ? h('div', {}, h('p', { class: 'erreur' }, 'À corriger avant de publier :'), h('ul', { class: 'liste' }, p.map((x) => h('li', { class: 'erreur' }, x)))) : h('p', { class: 'ok' }, 'Lisibilité : bonne.'));
      st(t, 'font-family', '"' + policesTheme().titres + '",serif'); st(tp, 'font-family', '"' + policesTheme().texte + '",sans-serif'); st(tm, 'font-family', '"' + policesTheme().texte + '",sans-serif');
      st(t, 'font-size', (1.3 * ECHELLES.find((e) => e.cle === tailleTheme()).v) + 'rem'); st(tp, 'font-size', ECHELLES.find((e) => e.cle === tailleTheme()).v + 'rem'); st(tm, 'font-size', ECHELLES.find((e) => e.cle === tailleTheme()).v + 'rem');
      for (const f of champs) f();
      rafraichir();
    };
    main.append(widget, etat, h('h2', {}, 'Couleurs'));
    for (const x of COULEURS) {
      const id = 'col-' + x.cle, sel = h('input', { type: 'color', id, 'aria-label': x.nom }), code = h('input', { type: 'text', id: id + '-code', maxlength: '7', autocapitalize: 'off', spellcheck: 'false', 'aria-label': x.nom + ' (code)' });
      const sync = () => { const v = couleursTheme()[x.cle]; sel.value = v.toLowerCase(); if (document.activeElement !== code) code.value = v; };
      champs.push(sync); sync();
      sel.addEventListener('input', () => { fixerCouleur(x.cle, sel.value.toUpperCase()); modifie(); maj(); });
      code.addEventListener('input', () => { const v = code.value.trim(); if (HEX.test(v)) { fixerCouleur(x.cle, v.toUpperCase()); modifie(); maj(); } });
      code.addEventListener('blur', () => { code.value = couleursTheme()[x.cle]; });
      main.append(h('label', { for: id }, x.nom), h('p', { class: 'doux' }, x.ou), h('div', { class: 'outils' }, sel, code,
        h('button', { class: 'petit', onclick: () => { fixerCouleur(x.cle, DEF[x.cle]); modifie(); maj(); } }, "Couleur d'origine (" + DEF[x.cle] + ')')));
    }
    main.append(h('h2', {}, 'Polices'));
    main.append(h('p', { class: 'doux' }, "Toutes les polices du catalogue sont libres de droits et hébergées sur le site (rien n'est chargé depuis un autre site)."));
    for (const r of ROLES) {
      const id = 'pol-' + r.cle, sel = h('select', { id, 'aria-label': r.nom }, toutesPolices().filter((p) => !r.texte || p.texte).map((p) => h('option', { value: p.cle }, p.nom)));
      const ex = h('p', { class: 'doux', id: id + '-ex' }, r.cle === 'musique' ? 'RVL' : r.cle === 'titres' ? 'Un beau titre : Oriana Valenza' : 'Voici un texte pour juger de la lisibilité et des chiffres (2026).');
      const sync = () => { const v = policesTheme()[r.cle]; sel.value = v; chargerPolice(v); ex.style.setProperty('font-family', '"' + v + '",serif'); ex.style.setProperty('font-size', r.cle === 'texte' ? '1rem' : '1.6rem'); ex.style.setProperty('color', couleursTheme().ink); };
      champs.push(sync); sync();
      sel.addEventListener('change', () => { fixerPolice(r.cle, sel.value); modifie(); maj(); });
      main.append(h('label', { for: id }, r.nom), h('p', { class: 'doux' }, r.ou), h('div', { class: 'outils' }, sel,
        h('button', { class: 'petit', onclick: () => { fixerPolice(r.cle, r.def); modifie(); maj(); } }, "Police d'origine")), ex);
    }
    main.append(depotPolice());
    main.append(h('h2', {}, 'Taille du texte'), h('p', { class: 'doux' }, 'Une seule taille pour tout le site (pour agrandir ou réduire tous les textes d\'un coup).'));
    const radios = ECHELLES.map((e) => { const r = h('input', { type: 'radio', name: 'taille', id: 'taille-' + e.cle, value: e.cle }); r.addEventListener('change', () => { fixerTaille(e.cle); modifie(); maj(); }); return r; });
    champs.push(() => { radios.forEach((r) => { r.checked = r.value === tailleTheme(); }); });
    main.append(h('div', { class: 'outils' }, ECHELLES.map((e, i) => h('label', { for: 'taille-' + e.cle }, radios[i], ' ' + e.nom))));
    maj();
    main.append(h('div', { class: 'outils' }, h('button', { class: 'danger', onclick: async () => {
      if (!(await confirmer("Remettre le thème d'origine ?", "Les couleurs, les polices et la taille du texte reviennent à celles du départ (rien n'est publié tant que tu ne publies pas).", "Remettre le thème d'origine"))) return;
      S.docs.theme = {}; modifie(); rendu();
    } }, "Remettre le thème d'origine")));
  }

  function bandeauJeton() {
    const b = $('#bandeau'); b.replaceChildren();
    if (!S.jeton) return;
    if (S.tailleKo > 500000) b.append(h('div', { class: 'b rouge' }, `Le site pèse ${Math.round(S.tailleKo / 1024)} Mo : GitHub Pages est limité à 1 000 Mo. Évite d'ajouter de grosses photos ou des PDF lourds et préviens Simon.`));
    else if (S.tailleKo > 300000) b.append(h('div', { class: 'b' }, `Le site pèse ${Math.round(S.tailleKo / 1024)} Mo (limite : 1 000 Mo). Pense à ne mettre que des photos utiles.`));
    if (!S.expire) return;
    const jours = Math.ceil((new Date(S.expire + 'T23:59:59') - new Date()) / 86400000);
    if (jours < 0) b.append(h('div', { class: 'b rouge' }, `Ton jeton a expiré le ${S.expire}. Il faut le renouveler (voir l'Aide).`));
    else if (jours <= 30) b.append(h('div', { class: 'b' }, `Ton jeton expire dans ${jours} jour(s) (le ${S.expire}). Pense à le renouveler (voir l'Aide).`));
  }

  function ecranConnexion(msg) {
    rendu = null; barre(null);
    const jeton = h('input', { type: 'password', id: 'jeton', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    const date = h('input', { type: 'date', id: 'expire', value: (S.expire || d.toISOString().slice(0, 10)) });
    const etat = h('p', { class: 'erreur' }, msg || '');
    const bouton = h('button', { class: 'primaire', onclick: async () => {
      S.jeton = jeton.value.trim(); S.expire = date.value || null;
      if (!S.jeton) { etat.textContent = 'Colle ton jeton dans le champ.'; return; }
      bouton.disabled = true; etat.textContent = '';
      try { await charger(); ecrire('ov_jeton', S.jeton); ecrire('ov_expire', S.expire); montrer('accueil'); }
      catch (e) { S.jeton = null; etat.textContent = e.message; bouton.disabled = false; }
    } }, 'Me connecter');
    $('#ecran').replaceChildren(h('h2', {}, 'Connexion'),
      h('p', {}, "Pour modifier le site, colle ici ton « jeton » (la clé que tu as créée sur GitHub : voir l'Aide, étape 3). Il reste dans ce navigateur et n'est envoyé qu'à GitHub."),
      h('label', { for: 'jeton' }, 'Mon jeton'), jeton,
      h('label', { for: 'expire' }, "Date d'expiration du jeton (indiquée sur GitHub)"), date,
      h('p', { class: 'doux' }, 'Je te préviendrai un mois avant, pour que tu le renouvelles à temps.'), etat, h('div', { class: 'outils' }, bouton));
  }

  function ecranAccueil() {
    rendu = null; barre(null); bandeauJeton();
    const n = changes().length;
    const grille = h('div', { class: 'grille' }, SECTIONS.map((s) => {
      const c = compteSection(s);
      return h('button', { onclick: () => ecranSection(s) }, h('strong', {}, s.titre), h('span', { class: 'doux' }, s.aide), c ? h('span', { class: 'compte' }, `${c} modification(s) en attente`) : null);
    }));
    $('#ecran').replaceChildren(
      h('h2', {}, 'Que veux-tu modifier ?'), grille,
      h('h3', {}, 'Publication'),
      h('div', { class: 'grille' },
        h('button', { class: n ? 'primaire' : '', disabled: !n, onclick: () => montrer('publier') }, n ? 'Voir et publier mes modifications' : 'Aucune modification en attente'),
        S.annuler && h('button', { onclick: annulerDerniere }, 'Annuler ma dernière publication'),
        h('button', { onclick: ecranHistorique }, 'Voir les anciennes versions du site')),
      h('p', { class: 'doux' }, S.brouillonOk ? 'Tes modifications précédentes ont été retrouvées.' : ''),
      h('div', { class: 'outils' }, h('button', { class: 'petit', onclick: () => { ecrire('ov_jeton', null); ecrire('ov_expire', null); S.jeton = null; ecranConnexion('Colle ton NOUVEAU jeton. Tes modifications en attente sont gardées.'); } }, 'Renouveler mon jeton'),
        h('button', { class: 'petit', onclick: () => { ecrire('ov_jeton', null); ecrire('ov_expire', null); S.jeton = null; ecranConnexion('Tu es déconnectée.'); } }, 'Me déconnecter')));
  }

  function ecranPublier() {
    rendu = () => ecranPublier(); bandeauJeton();
    const main = $('#ecran'), lignes = resumerChangements(), { erreurs, avert, contacts } = controler();
    main.replaceChildren(h('button', { onclick: () => montrer('accueil') }, '← Retour au menu'), h('h2', {}, 'Ce que tu vas publier'));
    if (!lignes.length) { main.append(h('p', {}, "Il n'y a rien à publier pour l'instant.")); barre(null); return; }
    if (erreurs.length) main.append(h('h3', {}, 'À corriger avant de publier'), h('ul', { class: 'liste' }, erreurs.map((e) => h('li', { class: 'erreur' }, e))));
    if (contacts.length) main.append(h('h3', {}, 'Contacts à confirmer'), h('ul', { class: 'liste' }, contacts.map((c) => h('li', { class: 'avert' }, `${c.type} : ${c.valeur} sera visible par tout le monde. Tu le confirmeras en publiant.`))));
    if (avert.length) main.append(h('ul', { class: 'liste' }, avert.map((e) => h('li', { class: 'avert' }, e))));
    main.append(h('h3', {}, `${lignes.length} changement(s)`), h('ul', { class: 'liste' }, lignes.slice(0, 60).map((l) => h('li', { class: 'ok' }, h('strong', {}, l.txt), ' : ' + l.type,
      l.type === 'modifié' && typeof l.avant === 'string' ? h('div', { class: 'doux' }, `« ${l.avant.slice(0, 50)}${l.avant.length > 50 ? '…' : ''} » → « ${String(l.apres ?? '').slice(0, 50)}${String(l.apres ?? '').length > 50 ? '…' : ''} »`) : null))),
      lignes.length > 60 ? h('p', { class: 'doux' }, `… et ${lignes.length - 60} autres.`) : null);
    const progres = h('ul', { class: 'liste', id: 'progres' });
    main.append(progres);
    barre([{ label: 'Menu', fn: () => montrer('accueil') }, { label: 'Publier', primaire: true, off: erreurs.length > 0, fn: () => publier(contacts, progres) }]);
  }

  function montrer(nom) { if (nom === 'accueil') ecranAccueil(); else if (nom === 'publier') ecranPublier(); else if (nom === 'connexion') ecranConnexion(); scrollTo(0, 0); }

  /* ---------- Publication par branche de brouillon ---------- */
  const horodatage = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  async function pipeline(modifs, message, progres) {
    const etape = (txt) => { progres.append(h('li', {}, txt)); progres.lastChild.scrollIntoView({ block: 'nearest' }); };
    etape('Préparation…');
    const tete = (await gh(`${R}/git/ref/heads/${PRINCIPALE}`)).object.sha;
    for (const m of modifs) { // le site a-t-il changé depuis le chargement ?
      if (m.cle && S.sha[m.cle] !== undefined) {
        const f = await lireFichier(m.chemin); const sha = f ? f.sha : null;
        if (sha !== S.sha[m.cle] && !m.sansConflit) throw new Erreur('Le site a été modifié par quelqu\'un d\'autre pendant que tu éditais. Recharge la page ; tes modifications resteront si possible.', 'conflit');
      }
    }
    const branche = 'brouillon-' + horodatage();
    message = `${message} (${branche})`; // message unique : l'historique regroupe les commits d'une même publication
    await gh(`${R}/git/refs`, { method: 'POST', body: { ref: 'refs/heads/' + branche, sha: tete } });
    etape('Brouillon créé (mode essai).');
    let dernier = null;
    try {
      for (const m of modifs) {
        const f = await lireFichier(m.chemin, branche);
        if (m.contenu == null) { if (!f) continue; const r = await gh(`${R}/contents/${chemin(m.chemin)}`, { method: 'DELETE', body: { message, sha: f.sha, branch: branche } }); dernier = r.commit.sha; }
        else { const r = await gh(`${R}/contents/${chemin(m.chemin)}`, { method: 'PUT', body: { message, content: versB64(m.contenu), branch: branche, ...(f ? { sha: f.sha } : {}) } }); dernier = r.commit.sha; }
        etape('Envoyé : ' + m.chemin);
      }
      if (!dernier) throw new Erreur("Rien n'a changé.", 'vide');
      // contrôle automatique : attendu seulement s'il est actif (débrayage possible)
      let actif = false, sansDroit = false;
      try { const w = await gh(`${R}/actions/workflows`); actif = (w.workflows || []).some((x) => /controle\.yml$/.test(x.path) && x.state === 'active'); } catch (e) { actif = false; sansDroit = e.code === 'droit' || e.code === 'absent'; }
      if (actif) {
        etape('Contrôle de sécurité en cours…');
        const limite = Date.now() + 150000; let verdict = null;
        while (Date.now() < limite && !verdict) {
          await new Promise((ok) => setTimeout(ok, LOCAL ? 300 : 4000));
          const c = await gh(`${R}/commits/${dernier}/check-runs`);
          const l = (c.check_runs || []).filter((x) => x.name === 'controle'); // seul le contrôle anti-secrets bloque la publication
          if (l.length && l.every((x) => x.status === 'completed')) verdict = l.every((x) => ['success', 'neutral', 'skipped'].includes(x.conclusion)) ? 'ok' : 'refus';
        }
        if (verdict === 'refus') throw new Erreur("Le contrôle de sécurité a refusé la publication (un numéro, un e-mail ou un fichier non voulu ?). Rien n'a été publié. Vérifie tes textes ou demande de l'aide.", 'controle');
        if (!verdict) throw new Erreur("Le contrôle de sécurité met trop de temps. Rien n'a été publié : réessaie dans quelques minutes.", 'delai');
        etape('Contrôle réussi.');
      } else if (sansDroit) etape('Ton jeton ne permet pas de lire le contrôle automatique (il manque « Actions » et « Checks » en lecture) : publication sans l\'attendre. Voir l\'Aide, étape « Créer le jeton ».');
      else etape('Contrôle automatique absent ou désactivé : publication sans l\'attendre (tes textes ont déjà été vérifiés ici).');
      await gh(`${R}/merges`, { method: 'POST', body: { base: PRINCIPALE, head: branche, commit_message: message } });
      etape('Publié.');
    } finally { try { await gh(`${R}/git/refs/heads/${branche}`, { method: 'DELETE' }); } catch { /* nettoyage facultatif */ } }
    return tete;
  }

  async function publier(contacts, progres) {
    const boutons = document.querySelectorAll('.barre button'); boutons.forEach((b) => { b.disabled = true; });
    progres.replaceChildren();
    try {
      for (const c of contacts) { // liste blanche : confirmation explicite, un contact à la fois
        const champ = h('input', { type: 'text', value: 'contact pro' });
        const rep = await dialogue('Ce contact sera public', h('div', {}, h('p', {}, `${c.type} : `, h('strong', {}, c.valeur)), h('p', {}, "Il sera visible par tout le monde sur le site. Est-ce voulu ?"), h('label', {}, 'À quoi il sert (pour t\'en souvenir)'), champ),
          [{ label: 'Non, je retourne corriger', valeur: false }, { label: "Oui, c'est voulu", valeur: true, primaire: true }]);
        if (!rep) { progres.append(h('li', { class: 'avert' }, 'Publication annulée : corrige le texte concerné.')); boutons.forEach((b) => { b.disabled = false; }); return; }
        S.docs.contacts = (String(S.docs.contacts || '').replace(/\s*$/, '\n') + `${c.valeur} | ${champ.value.replace(/[|\n]/g, ' ').trim() || 'contact'}\n`);
      }
      const modifs = [];
      const ch = changes();
      for (const k of ch) modifs.push({ cle: k, chemin: FICHIERS[k], contenu: ser(k) });
      if (ch.includes('theme')) modifs.push({ chemin: CSS_THEME, contenu: cssTheme(couleursTheme(), policesTheme(), tailleTheme()) }); // feuille de style générée : jamais saisie à la main
      for (const d of deposees()) { const f = S.staged.get('polices/' + d.fichier); if (f) modifs.push({ chemin: 'polices/' + d.fichier, contenu: new Uint8Array(await f.blob.arrayBuffer()) }); } // polices déposées (seulement celles de la liste du thème)
      const utilisees = new Set(JSON.stringify([S.docs.fr, S.docs.en]).match(/[^"\\]+\.webp/g) || []);
      for (const [p, f] of S.staged) if (utilisees.has(p.slice(4))) modifs.push({ chemin: p, contenu: new Uint8Array(await f.blob.arrayBuffer()) });
      const tete = await pipeline(modifs, 'Mise à jour du site depuis l\'éditeur', progres);
      S.annuler = { tete, chemins: modifs.map((m) => m.chemin), date: new Date().toISOString() }; ecrire('ov_annuler', JSON.stringify(S.annuler));
      S.staged.clear(); ecrire('ov_brouillon', null);
      progres.append(h('li', { class: 'ok' }, 'Ton site sera à jour dans 1 à 3 minutes. Recharge la page du site pour voir le résultat.'));
      await charger(); S.brouillonOk = false;
      barre([{ label: 'Retour au menu', primaire: true, fn: () => montrer('accueil') }]);
    } catch (e) {
      progres.append(h('li', { class: 'erreur' }, e.message || String(e)));
      if (e.code === 'jeton') ecrire('ov_jeton', null);
      boutons.forEach((b) => { b.disabled = false; });
    }
  }

  async function annulerDerniere() {
    if (!S.annuler) return;
    if (!(await confirmer('Annuler ta dernière publication ?', 'Le site reviendra à ce qu\'il était juste avant (textes et photos de cette publication).', 'Annuler la publication'))) return;
    const main = $('#ecran'); const progres = h('ul', { class: 'liste' }); main.replaceChildren(h('h2', {}, 'Annulation'), progres); barre(null);
    try {
      const modifs = [];
      for (const p of S.annuler.chemins) {
        const avant = await lireFichier(p, S.annuler.tete);
        const cle = Object.keys(FICHIERS).find((k) => FICHIERS[k] === p);
        modifs.push({ chemin: p, cle, sansConflit: true, contenu: avant ? avant.texte : null });
      }
      await pipeline(modifs, 'Annulation de la dernière publication', progres);
      S.annuler = null; ecrire('ov_annuler', null); await charger();
      progres.append(h('li', { class: 'ok' }, 'Annulé. Le site sera à jour dans 1 à 3 minutes.'));
    } catch (e) { progres.append(h('li', { class: 'erreur' }, e.message || String(e))); }
    barre([{ label: 'Retour au menu', primaire: true, fn: () => montrer('accueil') }]);
  }

  /* ---------- Historique : revenir à une version précédente ---------- */
  const MSG_PUB = /^(Mise à jour du site depuis l'éditeur|Annulation de la dernière publication|Retour à la version)/;
  function publications(commits) { // une publication = tous les commits de même message (un par fichier envoyé, plus la fusion)
    const sortie = [];
    for (const c of commits) {
      const msg = String(c.commit.message).split(/\r?\n/)[0];
      if (!MSG_PUB.test(msg)) continue;
      if (sortie.length && sortie[sortie.length - 1].msg === msg) continue; // le plus récent représente la publication
      sortie.push({ sha: c.sha, msg, t: Date.parse(c.commit.committer.date) });
    }
    return sortie;
  }
  const quand = (t) => new Date(t).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const genre = (msg) => (msg.startsWith('Annulation') ? 'Annulation' : msg.startsWith('Retour') ? 'Retour à une version' : 'Publication');
  async function ecranHistorique() {
    rendu = null; barre(null);
    const main = $('#ecran'); const liste = h('ul', { class: 'liste', id: 'historique' });
    main.replaceChildren(h('button', { onclick: () => montrer('accueil') }, '← Retour au menu'), h('h2', {}, 'Anciennes versions du site'),
      h('p', { class: 'doux' }, 'Chaque ligne est une publication. « Revenir à cette version » remet le site comme il était juste après elle. Tu peux ensuite annuler ce retour.'), liste, h('p', { id: 'progres-histo' }, 'Chargement…'));
    try {
      const pubs = publications(await gh(`${R}/commits?sha=${PRINCIPALE}&per_page=100`));
      $('#progres-histo').remove();
      if (!pubs.length) { main.append(h('p', {}, "Aucune publication faite depuis l'éditeur pour l'instant.")); return; }
      pubs.slice(0, 30).forEach((p, i) => liste.append(h('li', { class: 'ok' }, h('strong', {}, quand(p.t)), ` : ${genre(p.msg)}`,
        i === 0 ? h('span', { class: 'doux' }, ' (version actuelle)') : h('div', { class: 'outils' }, h('button', { class: 'petit', onclick: () => revenirA(p) }, 'Revenir à cette version')))));
    } catch (e) { $('#progres-histo').replaceChildren(h('span', { class: 'erreur' }, e.message || String(e))); }
  }
  async function revenirA(p) {
    const n = changes().length, date = quand(p.t);
    if (!(await confirmer('Revenir à cette version ?', `Le site reviendra à ce qu'il était après la publication du ${date}. ${n ? 'Tes modifications non publiées seront mises de côté. ' : ''}Tu pourras annuler ce retour avec « Annuler ma dernière publication ».`, 'Revenir à cette version'))) return;
    const progres = h('ul', { class: 'liste' }); $('#ecran').replaceChildren(h('h2', {}, 'Retour à une ancienne version'), progres); barre(null);
    try {
      const modifs = [];
      for (const [k, chem] of Object.entries({ ...FICHIERS, themecss: CSS_THEME })) {
        const ancien = await lireFichier(chem, p.sha); if (!ancien) continue; // fichier qui n'existait pas encore : on n'y touche pas
        const actuel = await lireFichier(chem);
        if (actuel && actuel.texte === ancien.texte) continue;
        modifs.push({ chemin: chem, cle: k, sansConflit: true, contenu: ancien.texte });
      }
      if (!modifs.length) { progres.append(h('li', { class: 'ok' }, 'Le site est déjà dans cet état : rien à faire.')); }
      else {
        const tete = await pipeline(modifs, 'Retour à la version du ' + date, progres);
        S.annuler = { tete, chemins: modifs.map((m) => m.chemin), date: new Date().toISOString() }; ecrire('ov_annuler', JSON.stringify(S.annuler));
        S.staged.clear(); ecrire('ov_brouillon', null);
        await charger(); S.brouillonOk = false;
        progres.append(h('li', { class: 'ok' }, 'Le site est revenu à cette version. Il sera à jour dans 1 à 3 minutes.'));
      }
    } catch (e) { progres.append(h('li', { class: 'erreur' }, e.message || String(e))); }
    barre([{ label: 'Retour au menu', primaire: true, fn: () => montrer('accueil') }]);
  }

  /* ---------- Démarrage ---------- */
  async function demarrer() {
    S.jeton = lire('ov_jeton'); S.expire = lire('ov_expire');
    try { S.annuler = JSON.parse(lire('ov_annuler') || 'null'); } catch { S.annuler = null; }
    if (!S.jeton) { ecranConnexion(); return; }
    try { await charger(); montrer('accueil'); }
    catch (e) { ecranConnexion(e.message); }
  }
  addEventListener('beforeunload', (ev) => { if (S.staged.size) { ev.preventDefault(); ev.returnValue = ''; } });
  demarrer();
})();
