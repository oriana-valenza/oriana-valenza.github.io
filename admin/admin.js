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
  const FICHIERS = { fr: 'donnees/fr.json', en: 'donnees/en.json', liens: 'donnees/liens.json', 'bio-fr': 'donnees/bio-fr.md', 'bio-en': 'donnees/bio-en.md', contacts: '.github/contacts_autorises.txt' };
  const JSONS = ['fr', 'en', 'liens'];
  const RE_MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const RE_TEL = /(^|[^0-9.,/-])(((\+ ?33|0033)[ .-]?[1-9]|0[1-9])([ .-]?[0-9]{2}){4}|\+ ?[0-9]{1,3}([ .-]?[0-9]{2,4}){3,})(?=[^0-9]|$)/g;
  const RE_SECRET = /(password|passwd|mot de passe|secret|token|api[_-]?key)[^A-Za-z0-9]{0,3}[:=][^\]A-Za-z0-9]{0,3}[A-Za-z]*[0-9_/+-][A-Za-z0-9_/+-]{4,}/i;
  const RE_JETON = /\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,})\b/;
  const MAX_TEXTE = 6000;

  /* ---------- Libellés en français ---------- */
  const SECTIONS = [
    { id: 'rvl', titre: 'Musique (RVL)', aide: "L'EP, ses titres, les paroles, le kolam", cles: ['rvl'] },
    { id: 'ecriture', titre: 'Écriture', aide: 'Les livres', cles: ['ecriture'] },
    { id: 'audiovisuel', titre: 'Audiovisuel', aide: 'Films, documentaires, clips', cles: ['audiovisuel'] },
    { id: 'services', titre: 'Services', aide: 'Ateliers, coaching, accompagnement', cles: ['services'] },
    { id: 'oriana', titre: 'Oriana (présentation)', aide: 'Présentation et parcours', cles: ['oriana'] },
    { id: 'accueil', titre: 'Accueil et informations générales', aide: 'Nom, métier, ville, texte de la page d\'accueil', cles: ['site', 'accueil'] },
    { id: 'mentions', titre: 'Mentions légales', aide: 'Texte légal du site', cles: ['mentions'] },
    { id: 'ui', titre: 'Boutons, menus et messages', aide: 'Les petits textes du site', cles: ['ui', 'nav', 'page_404'] },
    { id: 'liens', titre: 'Liens', aide: 'YouTube, Spotify, Amazon, réseaux', special: 'liens' },
    { id: 'bio', titre: 'Biographie', aide: 'Le texte de présentation', special: 'bio' },
  ];
  const ETIQ = {
    titre: 'Titre', sous_titre: 'Sous-titre', intro: 'Introduction', texte: 'Texte', resume: 'Résumé', etat: "État (ex : En cours d'écriture)",
    detail: 'Détail', image: 'Photo', image_alt: 'Description de la photo (pour les personnes qui ne la voient pas)', lien: 'Lien', infos: 'Infos en plus',
    h: 'Titre de la partie', films: 'Films de cette partie', parties: 'Parties', oeuvres: 'Livres', offres: 'Offres', titres: "Titres de l'EP", titres_h: 'Titre de la liste des titres',
    sens: 'Sens du titre', paroles: 'Paroles', instrumental: 'Titre instrumental (sans paroles)', kicker: 'Ligne au-dessus du titre', date: 'Date',
    parcours: 'Parcours', parcours_h: 'Titre « Parcours »', sections: 'Sections', p: 'Paragraphes', credit: 'Crédit', credit_label: 'Rôle du crédit',
    meta_titre: 'Titre affiché sur Google', meta_description: 'Description affichée sur Google', paysage: 'Photo en format paysage', portrait_alt: 'Description du portrait',
    nom: 'Nom', metier: 'Métier', ville: 'Ville', kolam_h: 'Titre « Un symbole, une prière »', kolam_txt: 'Texte du kolam', kolam_alt: 'Description du kolam',
    siret: 'Numéro SIRET', plaquette: 'Plaquette', contact_h: 'Titre « Contact »', contact_txt: 'Texte du contact', contact_form: 'Texte du formulaire',
    clip_h: 'Titre « Clips »', clip_txt: 'Texte des clips', clip_bientot: 'Texte « clips bientôt »', concert_h: 'Titre « En concert »',
    concert_date: 'Libellé « Date »', concert_lieu: 'Libellé « Lieu »', concert_billets: 'Libellé « Billets »', lien_retour: 'Lien de retour',
  };
  const NOM_ELEMENT = { oeuvres: 'Livre', films: 'Film', parties: 'Partie', offres: 'Offre', titres: 'Titre', parcours: 'Étape', sections: 'Section', infos: 'Ligne', p: 'Paragraphe', kolam_txt: 'Paragraphe' };
  const SECTION_NOM = { rvl: 'Musique (RVL)', ecriture: 'Écriture', audiovisuel: 'Audiovisuel', services: 'Services', oriana: 'Oriana', accueil: 'Accueil', site: 'Informations générales', mentions: 'Mentions légales', ui: 'Boutons et menus', nav: 'Menu', page_404: 'Page introuvable' };
  const LIENS_ETIQ = { youtube: 'YouTube : identifiant de la vidéo (11 caractères)', spotify: 'Spotify', amazon: 'Amazon (livre)', billets: 'Billetterie', instagram: 'Instagram', facebook: 'Facebook', dates_concert: 'Date du concert', lieu_concert: 'Lieu du concert', youtube_batisseuse: 'YouTube Bâtisseuse : identifiant de la vidéo' };
  const PARTAGES = new Set(['image', 'lien', 'n', 'instrumental', 'paysage', 'date', 'langue']);
  const CACHES = new Set(['_note', 'langue', 'n']);
  const LONGS = new Set(['resume', 'texte', 'intro', 'paroles', 'p', 'kolam_txt', 'meta_description', 'sous_titre', 'detail', 'image_alt', 'sens']);

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
  const etiquette = (cle) => ETIQ[cle] || (cle.startsWith('aria_') ? 'Description pour lecteurs d\'écran' : cle.charAt(0).toUpperCase() + cle.slice(1).replace(/_/g, ' '));
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
  const changes = () => Object.keys(FICHIERS).filter((k) => ser(k) !== serBase(k));

  async function charger() {
    const depot = await gh(R);
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
      if (JSON.stringify(d.sha) === JSON.stringify(S.sha)) {
        S.docs = d.docs; S.brouillonOk = true; let perdues = 0;
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
      else { parts.push(etiquette(c)); precedent = c; }
    }
    return parts.join(' › ') + (fichier === 'en' ? ' (anglais)' : '');
  }
  function resumerChangements() {
    const lignes = [];
    for (const k of changes()) {
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
          if (k === 'fr' && o.image && !S.imgs.has(o.image) && !S.staged.has('img/' + o.image)) erreurs.push(`${nomChemin(k, [...ch, 'image'])} : cette photo n'est plus disponible, choisis-la à nouveau.`);
          if (k === 'fr' && o.image && !(o.image_alt || '').trim()) erreurs.push(`${nomChemin(k, [...ch, 'image_alt'])} : décris la photo en une phrase.`);
          if (o.lien && 'image' in o && !(o.lien in S.docs.liens)) erreurs.push(`${nomChemin(k, [...ch, 'lien'])} : ce lien n'existe pas dans la page « Liens ».`);
          for (const [c, x] of Object.entries(o)) if (!CACHES.has(c)) parcourir(x, [...ch, c]);
        }
      })(S.docs[k], []);
    }
    for (const [c, v] of Object.entries(S.docs.liens)) {
      if (c.startsWith('_') || v == null || v === '') continue;
      if (c.startsWith('youtube')) { if (!/^[\w-]{11}$/.test(v)) erreurs.push(`Liens › ${LIENS_ETIQ[c] || c} : l'identifiant YouTube a 11 caractères (la fin de l'adresse après « v= »).`); }
      else if (!['dates_concert', 'lieu_concert'].includes(c) && !/^https:\/\/\S+$/.test(v)) erreurs.push(`Liens › ${LIENS_ETIQ[c] || c} : l'adresse doit commencer par https://`);
    }
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

  function rendreObjet(conteneur, fr, en, chem) {
    for (const [cle, v] of Object.entries(fr)) {
      if (CACHES.has(cle)) continue;
      const nom = etiquette(cle);
      if (Array.isArray(v)) { conteneur.append(rendreListe(cle, fr, en, chem, nom)); continue; }
      if (estObjet(v)) { conteneur.append(h('h3', {}, nom)); const g = h('div', {}); rendreObjet(g, v, en[cle], [...chem, cle]); conteneur.append(g); continue; }
      if (cle === 'image') { conteneur.append(rendrePhoto(fr, en)); continue; }
      if (cle === 'lien' && 'image' in fr) { conteneur.append(rendreLien(fr, en)); continue; } // « lien » = clé de la page Liens (livres, films) ; ailleurs c'est un texte
      if (typeof v === 'boolean' || cle === 'instrumental' || cle === 'paysage') { conteneur.append(rendreCase(cle, fr, en, nom)); continue; }
      if (PARTAGES.has(cle) && cle !== 'lien') { // champ partagé (ex. date) : un seul champ, écrit dans les deux langues
        const id = 'c' + (++idn);
        conteneur.append(h('label', { for: id }, nom), champTexte(fr[cle], false, (x) => { fr[cle] = x; en[cle] = x; }, id)); continue;
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
    const blob = await new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('image'))), 'image/webp', 0.85));
    return { blob, url: URL.createObjectURL(blob) };
  }

  function rendreListe(cle, fr, en, chem, nom) {
    const arrFr = fr[cle], arrEn = en[cle], noun = NOM_ELEMENT[cle] || 'Élément';
    const texte = !arrFr.some(estObjet);
    const bloc = h('section', {}, h('h3', {}, nom));
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
        const titre = x.titre || x.h || (x.date ? `${x.date} : ${x.texte || ''}` : '') || `${noun} ${i + 1}`;
        const d = h('details', { class: 'carte', open: arrFr.length <= 3 }, h('summary', {}, `${noun} ${i + 1} : ${String(titre).slice(0, 60)}`));
        const g = h('div', {}); rendreObjet(g, x, arrEn[i], [...chem, cle, i]); d.append(g, outils(i)); bloc.append(d);
      }
    });
    bloc.append(h('div', { class: 'outils' }, h('button', { onclick: () => {
      const modeleFr = texte ? '' : squelette(arrFr[0] || {}), modeleEn = texte ? '' : clone(modeleFr);
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
        if (k.startsWith('_')) continue;
        const id = 'c' + (++idn);
        main.append(h('label', { for: id }, LIENS_ETIQ[k] || etiquette(k)), champTexte(L[k], false, (v) => { L[k] = v || null; }, id));
      }
      main.append(h('p', { class: 'doux' }, 'Laisse vide si tu n\'as pas encore le lien : le site affichera « Bientôt ». YouTube : seulement les 11 caractères après « v= ».'),
        h('div', { class: 'outils' }, h('button', { onclick: async () => {
          const champ = h('input', { type: 'text', placeholder: 'ex : TikTok' });
          const nom = await dialogue('Nouveau lien', h('div', {}, h('label', {}, 'Nom du lien'), champ), [{ label: 'Annuler', valeur: null }, { label: 'Ajouter', valeur: true, primaire: true }]);
          const cle = slug(champ.value).replace(/-/g, '_'); if (nom && cle && !(cle in L)) { L[cle] = null; LIENS_ETIQ[cle] = champ.value.trim(); modifie(); rendu(); }
        } }, '+ Ajouter un lien')));
    } else if (sec.special === 'bio') {
      main.append(h('p', { class: 'doux' }, 'Un paragraphe = un bloc, séparé du suivant par une ligne vide.'),
        h('div', { class: 'duo deux' },
          h('div', {}, h('p', { class: 'langue' }, 'Français'), champTexte(S.docs['bio-fr'], true, (v) => { S.docs['bio-fr'] = v; }, 'bio-fr')),
          h('div', {}, h('p', { class: 'langue' }, 'English'), champTexte(S.docs['bio-en'], true, (v) => { S.docs['bio-en'] = v; }, 'bio-en'))));
    } else {
      for (const cle of sec.cles) {
        if (sec.cles.length > 1) main.append(h('h3', {}, SECTION_NOM[cle] || etiquette(cle)));
        const g = h('div', {}); rendreObjet(g, S.docs.fr[cle], S.docs.en[cle], [cle]); main.append(g);
      }
    }
    main.append(h('div', { class: 'outils', style: 'margin-top:2rem' }, h('button', { class: 'danger', onclick: async () => {
      if (!(await confirmer('Remettre comme en ligne ?', 'Tes modifications non publiées de cette page seront effacées.', 'Remettre'))) return;
      const cles = sec.special === 'liens' ? ['liens'] : sec.special === 'bio' ? ['bio-fr', 'bio-en'] : null;
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
    if (sec.special === 'liens') return S.docs.liens && ser('liens') !== serBase('liens') ? 1 : 0;
    if (sec.special === 'bio') return ['bio-fr', 'bio-en'].filter((k) => ser(k) !== serBase(k)).length;
    let n = 0; const a = JSON.parse(S.baseSer.fr), b = JSON.parse(S.baseSer.en);
    for (const c of sec.cles) {
      n +=diffCompte(a[c], nettoyer(S.docs.fr)[c]) + diffCompte(b[c], nettoyer(S.docs.en)[c]);
    }
    return n;
  }
  const diffCompte = (a, b) => { const x = aplatir(a ?? {}), y = aplatir(b ?? {}); let n = 0; for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[k] ?? null) !== JSON.stringify(y[k] ?? null)) n++; return n; };

  function bandeauJeton() {
    const b = $('#bandeau'); b.replaceChildren();
    if (!S.jeton || !S.expire) return;
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
        S.annuler && h('button', { onclick: annulerDerniere }, 'Annuler ma dernière publication')),
      h('p', { class: 'doux' }, S.brouillonOk ? 'Tes modifications précédentes ont été retrouvées.' : ''),
      h('div', { class: 'outils' }, h('button', { class: 'petit', onclick: () => { ecrire('ov_jeton', null); ecrire('ov_expire', null); S.jeton = null; ecranConnexion('Tu es déconnectée.'); } }, 'Me déconnecter')));
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
          const l = c.check_runs || [];
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
      for (const k of changes()) modifs.push({ cle: k, chemin: FICHIERS[k], contenu: ser(k) });
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
