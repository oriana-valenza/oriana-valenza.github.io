/* Accueil : l'ange est le menu. Placement des 4 symboles autour de l'ange et du nom « Oriana » (repère de l'ange : viewBox -640 90 1280 2200). */
(() => {
  const MAINS = 1345;                        // bas du cadrage ordinateur : sous le bout des doigts
  // « echelle » : même taille visible que le kolam (référence).
  const SYMBOLES = {
    rvl:      {cle: 'rvl',         src: 'img/symboles/kolam.svg', page: 'rvl/'},
    ecriture: {cle: 'ecriture',    src: 'img/symboles/rose-petit.svg', echelle: 1.16, page: 'ecriture/'},
    audio:    {cle: 'audiovisuel', src: 'img/symboles/coeur-menu.svg', page: 'audiovisuel/'},
    services: {cle: 'services',    src: 'img/symboles/tasse-petit.svg', echelle: 1.2, page: 'services/'},
  };
  // Fenêtre (unités de l'ange), positions des symboles, bas du dessin [début du fondu, fin du fondu].
  // Mobile : ange en pied, symboles en colonne verticale centrée sur la jupe ; Audiovisuel en dernier, en bas de la robe
  // (au milieu, son libellé coupait la robe là où elle s'évase). « ordre » = ordre de haut en bas, repris pour la tabulation.
  const CADRES = {
    ordi: {fen: [-930, 40, 1860, MAINS - 40], bas: [1300, 1345], pos: {rvl: [-810, 420], audio: [810, 420], ecriture: [-810, 1040], services: [810, 1040]}},
    mobile: {fen: [-640, 60, 1280, 2250], bas: [2300, 2310], sym: '40px', ordre: ['rvl', 'ecriture', 'services', 'audio'],
      pos: {rvl: [0, 1330], ecriture: [0, 1560], services: [0, 1790], audio: [0, 2020]}},
  };
  const ORDRE = ['rvl', 'audio', 'ecriture', 'services'];
  const scene = document.getElementById('scene'), dessin = document.getElementById('dessin');
  const liens = {};
  ORDRE.forEach((id, i) => {
    const s = SYMBOLES[id], a = document.createElement('a');
    a.className = 'symbole'; a.dataset.int = s.page; a.href = s.page; a.style.animationDelay = (1.1 + i * .18) + 's';
    const icone = document.createElement('span'); icone.className = 'icone';
    const im = new Image(); im.alt = ''; im.src = s.src; if (s.echelle) im.style.transform = 'scale(' + s.echelle + ')';
    icone.appendChild(im);
    const lib = document.createElement('span'); lib.className = 'libelle'; lib.dataset.i18n = 'nav.' + s.cle; lib.textContent = s.cle === 'audiovisuel' ? 'Audiovisuel' : s.cle === 'ecriture' ? 'Écriture' : s.cle === 'rvl' ? 'RVL' : 'Services';
    a.addEventListener('animationend', () => a.classList.add('vu'));   // apparu : le fondu ne se rejoue pas si on le déplace
    a.append(icone, lib); scene.appendChild(a); liens[id] = a;
  });
  function placer() {
    const W = innerWidth, H = innerHeight, mobile = W < 700;
    const D = mobile ? CADRES.mobile : CADRES.ordi, [fx, fy, fw, fh] = D.fen;
    if (D.sym) document.documentElement.style.setProperty('--sym', D.sym); else document.documentElement.style.removeProperty('--sym');
    const f = document.getElementById('fondu'), c = document.getElementById('coupe');
    f.setAttribute('y', D.bas[0]); f.setAttribute('height', D.bas[1] - D.bas[0] + 1); c.setAttribute('y', D.bas[1]);
    const haut = 70, bas = 28, k = Math.min(W / fw, (H - haut - bas) / fh);
    const ox = (W - fw * k) / 2, oy = haut + Math.max(0, (H - haut - bas - fh * k) / 2);
    dessin.setAttribute('viewBox', `${fx} ${fy} ${fw} ${fh}`);
    Object.assign(dessin.style, {left: ox + 'px', top: oy + 'px', width: fw * k + 'px', height: fh * k + 'px'});
    const ordre = D.ordre || ORDRE;           // ordre du document = ordre visuel (tabulation, lecteurs d'écran)
    if (ordre.some((id, i) => scene.querySelectorAll('.symbole')[i] !== liens[id])) {
      ordre.forEach((id, i) => { liens[id].style.animationDelay = (1.1 + i * .18) + 's'; scene.appendChild(liens[id]); });
    }
    ORDRE.forEach((id) => { const [x, y] = D.pos[id]; liens[id].style.left = ox + (x - fx) * k + 'px'; liens[id].style.top = oy + (y - fy) * k + 'px'; });
  }
  addEventListener('resize', placer); placer();

  // Textes (langue) : menu, libellés, titre de page
  const maj = () => {
    OV.appliquer();
    const A = OV.T.accueil;
    document.title = A.meta_titre;
    const d = document.querySelector('meta[name="description"]'); if (d) d.content = A.meta_description;
    document.getElementById('dessin-t').textContent = A.aria_dessin;
    document.getElementById('lien-oriana').setAttribute('aria-label', A.aria_oriana);
    document.getElementById('lien-oriana').setAttribute('href', OV.adresse('oriana/'));
  };
  OV.pret.then(maj).catch(() => {});
  OV.quandLangue(maj);
})();
