/* Pages projet : construit le contenu à partir de donnees/fr.json ou en.json, joue l'intro (le symbole se trace puis s'allume),
   puis fait apparaître le contenu. Aucune ressource distante, aucun cookie. */
(() => {
  const PAGE = document.body.dataset.page;
  const SYMBOLES = {
    rvl: {fichier: 'kolam.svg'}, ecriture: {fichier: 'rose.svg'}, audiovisuel: {fichier: 'coeur.svg'},
    services: {fichier: 'tasse.svg'}, oriana: {fichier: 'aureole.svg', large: true},
  };
  const SYM = SYMBOLES[PAGE] || null;
  const PAGES = ['rvl', 'ecriture', 'audiovisuel', 'services', 'oriana'];
  const REDUIT = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const lienSur = (u) => typeof u === 'string' && /^https:\/\//.test(u);
  const contenu = document.getElementById('contenu'), pied = document.getElementById('pied');
  const cacheSvg = {};
  let introFaite = false;

  /* ---------- Symboles en SVG intégré ---------- */
  function chargerSymbole() {
    if (!SYM) return Promise.resolve(null);
    if (!cacheSvg.texte) cacheSvg.texte = fetch(OV.base + 'img/symboles/' + SYM.fichier).then((r) => r.text()).catch(() => '');
    return cacheSvg.texte;
  }
  function cloneSvg(texte) {
    if (!texte) return null;
    const doc = new DOMParser().parseFromString(texte, 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg.localName !== 'svg') return null;
    svg.querySelectorAll('title,desc').forEach((n) => n.remove());
    ['role', 'aria-label', 'aria-labelledby', 'width', 'height'].forEach((a) => svg.removeAttribute(a));
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    return document.importNode(svg, true);
  }

  /* ---------- Constructions de page ---------- */
  const lienEcoute = (cle, url) => {
    const nom = esc(OV.t('ui.' + cle));
    return lienSur(url) ? `<a class="lien-bouton" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${nom}</a>`
      : `<span class="lien-bouton vide">${nom} <span class="bientot">${esc(OV.t('ui.bientot'))}</span></span>`;
  };
  const urlYoutube = (cle = 'youtube') => (/^[\w-]{11}$/.test(OV.L[cle] || '') ? 'https://www.youtube.com/watch?v=' + OV.L[cle] : null);
  const image = (nom, alt, cls) => (nom ? `<img class="${cls}" src="${OV.base}img/${esc(nom)}" alt="${esc(alt)}" loading="lazy">` : '');

  function hero(P, alt) {
    return `<section class="cadre hero${SYM ? '' : ' sans-sym'}" aria-labelledby="titre-page">
      ${SYM ? `<div class="sym${SYM.large ? ' large' : ''}" id="sym-hero" role="img" aria-label="${esc(alt)}"></div>` : ''}
      <div class="texte">
        ${P.kicker ? `<p class="kicker">${esc(P.kicker)}</p>` : ''}
        <h1 id="titre-page">${esc(P.titre)}</h1>
        ${P.sous_titre ? `<p class="sous-titre">${esc(P.sous_titre)}</p>` : ''}
        ${P.intro ? `<p class="intro-texte">${esc(P.intro)}</p>` : ''}
        ${P.credit ? `<dl class="credit"><dt>${esc(P.credit_label)}</dt> <dd>${esc(P.credit)}</dd></dl>` : ''}
      </div></section>`;
  }
  const bloc = (titre, corps, id) => `<section class="cadre bloc entre"${id ? ` id="${id}"` : ''}><h2>${esc(titre)}</h2>${corps}</section>`;
  const bientot = () => `<span class="bientot">${esc(OV.t('ui.bientot'))}</span>`;

  function rvl(P) {
    const youtube = OV.L.youtube;
    const clip = /^[\w-]{11}$/.test(youtube || '')
      ? `<div class="cadre-video" id="cadre-video"><button class="lire" type="button" data-video="${esc(youtube)}"><span class="triangle" aria-hidden="true"></span><span>${esc(OV.t('ui.lire_video'))}</span></button></div><p class="note">${esc(OV.t('ui.video_note'))}</p>`
      : `<div class="cadre-video"><p class="vide">${esc(P.clip_bientot)}</p></div>`;
    return hero(P, P.kolam_alt) +
      bloc(OV.t('ui.ecouter_h'), `<div class="liens-ecoute">${lienEcoute('youtube', urlYoutube())}${lienEcoute('spotify', OV.L.spotify)}</div>`) +
      bloc(P.titres_h, `<ol class="titres">${P.titres.map((t) => {
        const paroles = typeof t.paroles === 'string' && t.paroles.trim()
          ? t.paroles.trim().split(/\n\s*\n/).map((x) => `<p>${esc(x)}</p>`).join('') : `<p class="muet">${esc(OV.t('ui.paroles_bientot'))}</p>`;
        const titre = t.instrumental ? `<span class="t">${esc(t.titre)}</span>`
          : `<span class="t"><button class="t-bouton" type="button" aria-expanded="false" aria-controls="paroles-${esc(t.n)}">${esc(t.titre)}</button></span>`;
        return `<li><span class="n">${esc(t.n)}</span>${titre}${t.sens ? `<span class="s">${esc(t.sens)}</span>` : ''}${t.instrumental ? '' : `<div class="paroles" id="paroles-${esc(t.n)}" role="region" aria-label="${esc(t.titre)}" hidden>${paroles}</div>`}</li>`;
      }).join('')}</ol>`) +
      bloc(P.clip_h, `<p>${esc(P.clip_txt)}</p>${clip}`) +
      bloc(P.concert_h, `<dl class="infos"><dt>${esc(P.concert_date)}</dt><dd>${OV.L.dates_concert ? esc(OV.L.dates_concert) : bientot()}</dd>
        <dt>${esc(P.concert_lieu)}</dt><dd>${OV.L.lieu_concert ? esc(OV.L.lieu_concert) : bientot()}</dd>
        <dt>${esc(P.concert_billets)}</dt><dd>${lienSur(OV.L.billets) ? `<a href="${esc(OV.L.billets)}" target="_blank" rel="noopener noreferrer">${esc(OV.t('ui.billets'))}</a>` : bientot()}</dd></dl>`) +
      bloc(P.kolam_h, Array.isArray(P.kolam_txt) ? P.kolam_txt.map((x) => `<p>${esc(x)}</p>`).join('') : P.kolam_txt ? `<p>${esc(P.kolam_txt)}</p>` : `<p>${bientot()}</p>`);
  }
  function ecriture(P) {
    return hero(P, OV.t('nav.ecriture')) + `<section class="cadre bloc entre"><div>${P.oeuvres.map((o) => {
      const lien = o.lien ? lienEcoute(o.lien, OV.L[o.lien]) : '';
      return `<article class="oeuvre"><div><h3>${esc(o.titre)}</h3>${o.etat ? `<p class="etat">${esc(o.etat)}</p>` : ''}${o.resume ? `<p class="resume">${esc(o.resume)}</p>` : ''}${lien ? `<p style="margin-top:20px">${lien}</p>` : ''}</div>${image(o.image, o.image_alt, 'couverture')}</article>`;
    }).join('')}</div></section>`;
  }
  function audiovisuel(P) {
    const film = (f) => {
      const lien = f.lien ? lienEcoute('youtube', urlYoutube(f.lien)) : '';
      return `<article class="film-vedette${f.image ? '' : ' sans-visuel'}"><div><h3>${esc(f.titre)}</h3><p class="resume">${esc(f.texte)}</p>${(f.infos || []).map((i) => `<p class="muet info">${esc(i)}</p>`).join('')}${lien ? `<p style="margin-top:20px">${lien}</p>` : ''}</div>
        ${f.image ? `<div class="visuel">${image(f.image, f.image_alt, 'visuel-img')}</div>` : ''}</article>`;
    };
    return hero(P, OV.t('nav.audiovisuel')) +
      P.parties.map((pa) => `<section class="cadre bloc entre"><h2 class="partie">${esc(pa.h)}</h2>${pa.films.map(film).join('')}</section>`).join('');
  }
  function services(P) {
    return hero(P, OV.t('nav.services')) +
      `<section class="cadre bloc entre"><div>${P.offres.map((o) => `<article class="oeuvre"><div><h3>${esc(o.titre)}</h3>${o.detail ? `<p class="etat">${esc(o.detail)}</p>` : ''}</div>${image(o.image, o.image_alt, 'affiche')}</article>`).join('')}</div></section>` +
      bloc(P.contact_h, `<p>${esc(P.contact_txt)}</p><p class="muet">${esc(P.contact_form)}</p><p class="muet">${esc(P.plaquette)}</p><p class="muet">${esc(P.siret)}</p>`);
  }
  async function oriana(P) {
    let paras = [];
    try { paras = (await fetch(OV.base + 'donnees/bio-' + OV.lang + '.md').then((r) => r.text())).split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean); } catch (_) {}
    return hero(P, OV.t('nav.oriana')) +
      `<section class="cadre bloc entre bio"><div class="bio-grille"><img class="portrait" src="${OV.base}img/oriana.webp" width="1000" height="1015" alt="${esc(P.portrait_alt)}" loading="lazy">
        <div>${paras.map((p) => `<p>${esc(p)}</p>`).join('')}</div></div></section>` +
      bloc(P.parcours_h, `<ol class="parcours">${P.parcours.map((p) => `<li><time>${esc(p.date)}</time><span>${esc(p.texte)}</span></li>`).join('')}</ol>`);
  }
  function mentions(P) {
    return hero(P, '') + `<section class="cadre bloc entre">${P.sections.map((s) => `<div class="legal-sec"><h3>${esc(s.h)}</h3>${s.p.map((x) => `<p>${esc(x)}</p>`).join('')}</div>`).join('')}</section>`;
  }
  function page404(P) {
    return hero({titre: P.titre, sous_titre: P.texte}, '') + `<section class="cadre bloc"><p><a data-int="" href="${OV.base || './'}">${esc(P.lien)}</a></p></section>`;
  }
  const CONSTRUIT = {rvl, ecriture, audiovisuel, services, oriana, mentions, '404': page404};

  function piedDePage() {
    const T = OV.t.bind(OV);
    const reseaux = ['instagram', 'facebook'].filter((k) => lienSur(OV.L[k]));
    return `<div class="cadre"><div class="colonnes">
      <div><a class="retour" data-int="" href="${OV.adresse('')}"><span class="tete-ange"><img src="${OV.base}img/ange.svg" alt="" loading="lazy" width="220" height="378"></span><span>${esc(T('ui.retour'))}</span></a></div>
      <div><h2>${esc(T('ui.contact_h'))}</h2><p>${esc(T('ui.contact_txt'))}</p><p>${esc(T('ui.contact_form'))}</p></div>
      <div><h2>${esc(T('ui.lettre_h'))}</h2><p>${esc(T('ui.lettre_txt'))}</p>
        ${reseaux.length ? `<h2 style="margin-top:22px">${esc(T('ui.reseaux_h'))}</h2><ul>${reseaux.map((k) => `<li><a href="${esc(OV.L[k])}" target="_blank" rel="noopener noreferrer">${esc(T('ui.' + k))}</a></li>`).join('')}</ul>` : ''}</div>
      <div><h2>${esc(T('ui.pages_h'))}</h2><ul>${PAGES.map((p) => `<li><a data-int="${p}/" href="${OV.adresse(p + '/')}"${p === PAGE ? ' aria-current="page"' : ''}>${esc(T('nav.' + p))}</a></li>`).join('')}</ul></div>
    </div><div class="bas-de-page"><span>© Oriana Valenza</span><a data-int="mentions-legales/" href="${OV.adresse('mentions-legales/')}">${esc(T('ui.mentions'))}</a></div></div>`;
  }

  /* ---------- Titre et description de l'onglet ---------- */
  function metas(P) {
    const titre = PAGE === '404' ? P.meta_titre : P.meta_titre;
    document.title = titre;
    const set = (sel, v) => { const e = document.querySelector(sel); if (e && v) e.setAttribute('content', v); };
    set('meta[name="description"]', P.meta_description);
    set('meta[property="og:title"]', titre); set('meta[property="og:description"]', P.meta_description);
    set('meta[property="og:locale"]', OV.lang === 'en' ? 'en_GB' : 'fr_FR');
  }

  /* ---------- Intro : le symbole se trace puis s'allume (4 à 5 s) ---------- */
  function jouerIntro(texteSvg) {
    const svg = cloneSvg(texteSvg);
    if (!svg) return false;
    const ov = document.createElement('div'); ov.className = 'intro';
    const sym = document.createElement('div'); sym.className = 'sym' + (SYM.large ? ' large' : '');
    sym.appendChild(svg); ov.appendChild(sym);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'passer'; btn.textContent = OV.t('ui.passer');
    ov.appendChild(btn); document.body.appendChild(ov);
    const anims = [], accent = 'rgb(' + getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim() + ')';
    const A = (el, kf, opt) => anims.push(el.animate(kf, Object.assign({fill: 'both', easing: 'ease-in-out'}, opt)));

    const trace = [...svg.querySelectorAll('[pathLength]')];
    const autres = [...svg.querySelectorAll('path,circle,ellipse,line,rect,polyline,text')].filter((e) => !e.hasAttribute('pathLength') && !e.closest('defs'));
    const groupe = (el) => { const g = el.closest('#rayons,#coeur,#epines,#flamme,#halo'); return g ? g.id : null; };
    const coeur = PAGE === 'audiovisuel';
    // Horaires (ms) : [début, durée]
    const PLAN = {coeur: [0, 900], epines: [700, 1100], flamme: [1700, 800], rayons: [2400, 1000], halo: [2600, 900]};
    const fin = coeur ? 4100 : 3900;

    const indexGroupe = {};
    trace.forEach((el, i) => {
      el.style.strokeDasharray = '1'; el.style.strokeDashoffset = '1';
      let debut, duree;
      const g = coeur ? groupe(el) : null;
      if (g && PLAN[g]) {
        const liste = trace.filter((x) => groupe(x) === g), k = liste.indexOf(el);
        const [d0, dd] = PLAN[g], pas = liste.length > 1 ? (dd * 0.6) / (liste.length - 1) : 0;
        debut = d0 + k * pas; duree = dd * 0.4 + (g === 'rayons' ? 300 : 500);
      } else { debut = (i / Math.max(1, trace.length)) * 1800; duree = 900; }
      A(el, [{strokeDashoffset: 1}, {strokeDashoffset: 0}], {delay: debut, duration: duree, easing: 'ease-out'});
      // Remplissages : apparaissent en douceur une fois le trait posé
      const cs = getComputedStyle(el);
      if (cs.fill && cs.fill !== 'none' && cs.fill !== 'rgba(0, 0, 0, 0)') {
        const fo = cs.fillOpacity;
        const d = debut + duree * 0.6 + (coeur && g === 'flamme' ? 300 : 500);
        A(el, [{fillOpacity: 0}, {fillOpacity: fo}], {delay: d, duration: 900});
      }
    });
    autres.forEach((el) => {
      const cs = getComputedStyle(el), g = coeur ? groupe(el) : null;
      const d = g && PLAN[g] ? PLAN[g][0] + 500 : (el.localName === 'text' ? 2200 : 1800 + Math.random() * 500);
      A(el, [{opacity: 0}, {opacity: cs.opacity}], {delay: d, duration: 1000});
    });
    if (PAGE === 'rvl') {                       // le kolam s'allume : du blanc à l'or
      svg.querySelectorAll('#ligne').forEach((el) => A(el, [{stroke: '#F2EFEA'}, {stroke: accent}], {delay: 2500, duration: 1200}));
      svg.querySelectorAll('#points').forEach((el) => A(el, [{fill: '#F2EFEA'}, {fill: accent}], {delay: 2500, duration: 1200}));
    }
    // Halo doux (progressif, sans à-coup)
    A(svg, [{filter: 'drop-shadow(0 0 0 rgba(' + getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim() + ',0))'}, {filter: 'drop-shadow(0 0 12px rgba(' + getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim() + ',.5))'}], {delay: 2600, duration: 1300});

    let termine = false;
    const finir = (vite) => {
      if (termine) return; termine = true; clearTimeout(minuteur);
      document.documentElement.classList.remove('intro-attente');
      ov.classList.add('sort');
      setTimeout(() => { anims.forEach((a) => a.cancel()); ov.remove(); }, vite ? 300 : 800);
    };
    const minuteur = setTimeout(() => finir(false), fin);
    btn.addEventListener('click', (e) => { e.stopPropagation(); finir(true); });
    ov.addEventListener('click', () => finir(true));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') finir(true); }, {once: true});
    btn.focus({preventScroll: true});
    return true;
  }

  function revelations() {
    const el = document.querySelectorAll('.entre:not(.vu)');
    if (REDUIT || !('IntersectionObserver' in window)) { el.forEach((x) => x.classList.add('vu')); return; }
    document.documentElement.classList.add('anim');
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -6% 0px'});
    el.forEach((x) => io.observe(x));
  }

  function video() {
    const b = document.querySelector('[data-video]'); if (!b) return;
    b.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + b.dataset.video + '?autoplay=1&rel=0';
      f.title = OV.t('rvl.clip_h'); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
      b.replaceWith(f);
    });
  }

  function paroles() {
    document.querySelectorAll('.t-bouton').forEach((b) => b.addEventListener('click', () => {
      const ouvert = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!ouvert));
      document.getElementById(b.getAttribute('aria-controls')).hidden = ouvert;
    }));
  }

  /* ---------- Construction ---------- */
  async function afficher() {
    const P = OV.t(PAGE === 'mentions' ? 'mentions' : PAGE === '404' ? 'page_404' : PAGE);
    metas(P);
    contenu.innerHTML = await CONSTRUIT[PAGE](P);
    pied.innerHTML = piedDePage();
    OV.appliquer();
    const texte = await chargerSymbole();
    const h = document.getElementById('sym-hero');
    if (h && texte) { const s = cloneSvg(texte); if (s) h.appendChild(s); }
    revelations(); video(); paroles();
    return texte;
  }

  OV.pret.then(async () => {
    const texte = SYM ? await chargerSymbole() : null;
    const lance = SYM && !REDUIT && texte;
    if (lance) document.documentElement.classList.add('intro-attente');
    await afficher();
    if (lance && !introFaite) { introFaite = true; if (!jouerIntro(texte)) document.documentElement.classList.remove('intro-attente'); }
    else document.documentElement.classList.remove('intro-attente');
  }).catch(() => {
    contenu.innerHTML = '<p class="sans-js">Erreur de chargement. / Loading error.</p>';
    document.documentElement.classList.remove('intro-attente');
  });
  OV.quandLangue(() => { afficher(); });
})();
