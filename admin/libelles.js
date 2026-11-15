/* Libellés et organisation de l'éditeur : le SEUL fichier à compléter quand un champ est ajouté au site.
   Vérifié automatiquement par outils/controle-libelles.js (Action GitHub) : un champ sans libellé fait échouer le contrôle. */
window.LIBELLES = (() => {
  const SECTIONS = [
    { id: 'rvl', titre: 'Musique (RVL)', aide: "L'EP, ses titres, les paroles, le kolam", cles: ['rvl'] },
    { id: 'ecriture', titre: 'Écriture', aide: 'Les livres', cles: ['ecriture'] },
    { id: 'audiovisuel', titre: 'Audiovisuel', aide: 'Films, documentaires, clips', cles: ['audiovisuel'] },
    { id: 'services', titre: 'Services', aide: 'Ateliers, coaching, accompagnement', cles: ['services'] },
    { id: 'oriana', titre: 'Oriana (présentation)', aide: 'Présentation et parcours', cles: ['oriana'] },
    { id: 'accueil', titre: 'Accueil et informations générales', aide: 'Nom, métier, ville, texte de la page d\'accueil', cles: ['site', 'accueil'] },
    { id: 'mentions', titre: 'Mentions légales', aide: 'Texte légal du site', cles: ['mentions'] },
    { id: 'ui', titre: 'Petits textes du site', aide: 'Bas de page, boutons, menu, messages', cles: ['ui', 'nav', 'page_404'] },
    { id: 'liens', titre: 'Liens', aide: 'YouTube, Spotify, Amazon, réseaux', special: 'liens' },
    { id: 'bio', titre: 'Biographie', aide: 'Le texte de présentation', special: 'bio' },
    { id: 'apparence', titre: 'Apparence : couleurs et polices', aide: 'Les couleurs, les polices et la taille du texte de tout le site', special: 'apparence' },
  ];
  // Couleurs du thème (donnees/theme.json). Chaque ligne dit où la couleur apparaît ; « def » = valeur d'origine (:root de css/base.css).
  const COULEURS = [
    { cle: 'bg', def: '#0A0A0A', nom: 'Fond du site', ou: 'Le fond de toutes les pages et du menu.' },
    { cle: 'surface', def: '#151515', nom: 'Fond des cartes', ou: 'Les encadrés et cartes (livres, offres, titres de l\'EP).' },
    { cle: 'ligne', def: '#2A2A2A', nom: 'Traits et séparations', ou: 'Les filets fins entre les blocs et autour des cartes.' },
    { cle: 'ink', def: '#F2EFEA', nom: 'Texte principal et dessin de l\'ange', ou: 'Les textes, les titres et le trait blanc de l\'ange.' },
    { cle: 'muted', def: '#B9B4AB', nom: 'Texte discret', ou: 'Les sous-titres, légendes et menu de langue (FR / EN).' },
    { cle: 'or', def: '#B8975A', nom: 'Or', ou: 'L\'auréole, les liens survolés et les accents des pages Musique, Services et Oriana.' },
    { cle: 'rouge', def: '#A8292E', nom: 'Rouge', ou: 'La rose, le cœur et les accents des pages Écriture et Audiovisuel.' },
  ];
  // Polices du catalogue (libres, licence OFL dans polices/OFL_<fichier>.txt). « base » = déjà déclarée dans css/base.css ; sinon @font-face écrit dans theme.css.
  // « poids » = poids du fichier ; « texte » = utilisable pour le texte courant (poids 300 à 600 nécessaires) ; « h1 » = échelle du titre de la page Musique (Italianno est très petite, elle vaut 1).
  const POLICES = [
    { cle: 'Petit Formal Script', nom: "Petit Formal Script (script attaché, titres d'origine)", gen: 'Georgia,serif', base: true, fichier: 'petit-formal-script-latin-400-normal', poids: '400', h1: 0.5 },
    { cle: 'Italianno', nom: "Italianno (script fin, titre Musique d'origine)", gen: 'Georgia,serif', base: true, fichier: 'italianno-latin-400-normal', poids: '400', h1: 1 },
    { cle: 'Montserrat', nom: "Montserrat (sans empattement, texte d'origine)", gen: 'system-ui,sans-serif', base: true, fichier: 'montserrat-latin-400-normal', poids: '400', texte: true, h1: 0.42 },
    { cle: 'Great Vibes', nom: 'Great Vibes (script élégant)', gen: 'Georgia,serif', fichier: 'great-vibes-latin-400-normal', poids: '400', h1: 0.55 },
    { cle: 'Pinyon Script', nom: 'Pinyon Script (script classique)', gen: 'Georgia,serif', fichier: 'pinyon-script-latin-400-normal', poids: '400', h1: 0.55 },
    { cle: 'Parisienne', nom: 'Parisienne (script souple)', gen: 'Georgia,serif', fichier: 'parisienne-latin-400-normal', poids: '400', h1: 0.55 },
    { cle: 'Allura', nom: 'Allura (script léger)', gen: 'Georgia,serif', fichier: 'allura-latin-400-normal', poids: '400', h1: 0.6 },
    { cle: 'Cinzel', nom: 'Cinzel (capitales classiques)', gen: 'Georgia,serif', fichier: 'cinzel-latin-400-normal', poids: '400', h1: 0.4 },
    { cle: 'Libre Baskerville', nom: 'Libre Baskerville (serif de livre)', gen: 'Georgia,serif', fichier: 'libre-baskerville-latin-400-normal', poids: '400', h1: 0.42 },
    { cle: 'Playfair Display', nom: 'Playfair Display (serif contrasté)', gen: 'Georgia,serif', fichier: 'playfair-display-latin-wght-normal', poids: '400 900', texte: true, h1: 0.42 },
    { cle: 'Cormorant', nom: 'Cormorant (serif fin)', gen: 'Georgia,serif', fichier: 'cormorant-latin-wght-normal', poids: '300 700', texte: true, h1: 0.5 },
    { cle: 'EB Garamond', nom: 'EB Garamond (serif classique)', gen: 'Georgia,serif', fichier: 'eb-garamond-latin-wght-normal', poids: '400 800', texte: true, h1: 0.45 },
    { cle: 'Lora', nom: 'Lora (serif lisible)', gen: 'Georgia,serif', fichier: 'lora-latin-wght-normal', poids: '400 700', texte: true, h1: 0.42 },
    { cle: 'Source Sans 3', nom: 'Source Sans 3 (sans empattement neutre)', gen: 'system-ui,sans-serif', fichier: 'source-sans-3-latin-wght-normal', poids: '200 900', texte: true, h1: 0.42 },
    { cle: 'Nunito', nom: 'Nunito (sans empattement arrondi)', gen: 'system-ui,sans-serif', fichier: 'nunito-latin-wght-normal', poids: '200 900', texte: true, h1: 0.42 },
    { cle: 'Open Sans', nom: 'Open Sans (sans empattement lisible)', gen: 'system-ui,sans-serif', fichier: 'open-sans-latin-wght-normal', poids: '300 800', texte: true, h1: 0.42 },
    { cle: 'Raleway', nom: 'Raleway (sans empattement élégant)', gen: 'system-ui,sans-serif', fichier: 'raleway-latin-wght-normal', poids: '200 900', texte: true, h1: 0.42 },
  ];
  // Dépôt d'une police par Oriana : au plus 5, 300 Ko chacune, formats courants ; « fmt » = valeur CSS de format().
  const DEPOT = { max: 5, octets: 300 * 1024, formats: { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' } };
  // Les 3 rôles de police (donnees/theme.json, clé « polices ») ; « def » = police d'origine, « ou » = où elle apparaît.
  const ROLES = [
    { cle: 'titres', var: 'titre', def: 'Petit Formal Script', nom: 'Police des titres', ou: 'Les grands titres et les titres des blocs, des livres, des films et des clips.' },
    { cle: 'texte', var: 'texte', def: 'Montserrat', nom: 'Police du texte', ou: "Tous les paragraphes, le menu, les boutons, les légendes et le nom en arc sur l'accueil.", texte: true },
    { cle: 'musique', var: 'titre-musique', def: 'Italianno', nom: 'Police du titre de la page Musique', ou: 'Seulement le grand titre « RVL » en haut de la page Musique.' },
  ];
  // Taille du texte : une seule échelle pour tout le site (multiplie toutes les tailles de texte).
  const ECHELLES = [{ cle: 'petit', nom: 'Petit', v: 0.9 }, { cle: 'normal', nom: "Normal (d'origine)", v: 1 }, { cle: 'grand', nom: 'Grand', v: 1.12 }];
  // Règle de couleur : ROUGE = titre d'un bloc de la page (dans l'ordre du site) ; NOIR = les champs à l'intérieur.
  const GOOGLE = { titre: 'Pour Google et le partage', cles: ['meta_titre', 'meta_description'] };
  const BLOCS = {
    rvl: [{ titre: 'En-tête de la page', cles: ['titre', 'sous_titre', 'intro', 'credit_label', 'credit'] }, { titre: "Les titres de l'EP", cles: ['titres_h', 'titres'] },
      { titre: 'Les clips', cles: ['clip_h', 'clip_txt', 'clip_bientot', 'clips'] }, { titre: 'En concert', cles: ['concert_h', 'concert_date', 'concert_lieu', 'concert_billets', 'concerts'] },
      { titre: 'Un symbole, une prière (le kolam)', cles: ['kolam_h', 'kolam_txt', 'kolam_alt'] }, GOOGLE],
    ecriture: [{ titre: 'En-tête de la page', cles: ['titre', 'sous_titre'] }, { titre: 'Les livres', cles: ['oeuvres'] }, GOOGLE],
    audiovisuel: [{ titre: 'En-tête de la page', cles: ['titre', 'sous_titre'] }, { titre: 'Les parties et leurs films', cles: ['parties'] }, GOOGLE],
    services: [{ titre: 'En-tête de la page', cles: ['titre', 'sous_titre'] }, { titre: 'Les offres', cles: ['offres'] },
      { titre: 'Me contacter', cles: ['contact_h', 'contact_txt', 'contact_form', 'plaquette', 'siret'] }, GOOGLE],
    oriana: [{ titre: 'En-tête de la page', cles: ['kicker', 'titre', 'sous_titre', 'portrait_alt'] }, { titre: 'Parcours', cles: ['parcours_h', 'parcours'] }, GOOGLE],
    mentions: [{ titre: 'En-tête de la page', cles: ['titre', 'sous_titre'] }, { titre: 'Les sections', cles: ['sections'] }, GOOGLE],
    accueil: [{ titre: "Page d'accueil", cles: ['aria_dessin', 'aria_oriana'] }, GOOGLE],
    site: [{ titre: 'Nom, métier et ville', cles: ['nom', 'metier', 'ville'] }],
    nav: [{ titre: 'Noms des pages dans le menu', cles: null }],
    page_404: [{ titre: 'Page introuvable (erreur 404)', cles: null }],
    ui: [{ titre: 'Menu et navigation', cles: ['menu_ouvrir', 'menu_fermer', 'menu_nav', 'langue', 'passer', 'retour', 'aller_contenu'] },
      { titre: 'Bas de page', cles: ['contact_h', 'contact_txt', 'contact_form', 'lettre_h', 'lettre_txt', 'pages_h', 'reseaux_h', 'mentions'] },
      { titre: 'Boutons et liens', cles: ['ecouter_h', 'youtube', 'spotify', 'billets', 'amazon', 'instagram', 'facebook'] },
      { titre: 'Lecteur de vidéo et contenus à venir', cles: ['lire_video', 'video_note', 'bientot', 'paroles_bientot', 'visuel_bientot'] },
      { titre: "Messages d'erreur", cles: ['sans_js', 'erreur'] }],
  };
  const ETIQ = {
    reseaux: 'Autres réseaux', url: 'Adresse',
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
  const NOM_ELEMENT = { reseaux: 'Réseau', concerts: 'Concert', clips: 'Clip', oeuvres: 'Livre', films: 'Film', parties: 'Partie', offres: 'Offre', titres: 'Titre', parcours: 'Étape', sections: 'Section', infos: 'Ligne', p: 'Paragraphe', kolam_txt: 'Paragraphe' };
  const SECTION_NOM = { rvl: 'Musique (RVL)', ecriture: 'Écriture', audiovisuel: 'Audiovisuel', services: 'Services', oriana: 'Oriana', accueil: 'Accueil', site: 'Informations générales', mentions: 'Mentions légales', ui: 'Textes du site (boutons, bas de page, messages)', nav: 'Noms des pages dans le menu', page_404: 'Page introuvable (erreur 404)' };
  const LIENS_ETIQ = {
    youtube: 'YouTube : bouton « YouTube » de « Écouter et suivre » (page Musique). Colle l\'adresse de ta chaîne, d\'une playlist ou d\'une vidéo. (Les clips avec lecteur se règlent dans Musique, « Clips ».)',
    spotify: 'Spotify : bouton « Spotify » (page Musique). Adresse commençant par https://',
    amazon: 'Amazon : bouton du livre « Différente comme tout le monde » (page Écriture)',
    billets: 'Billetterie : lien « Billets » du concert (page Musique)',
    instagram: 'Instagram : lien en bas de toutes les pages',
    facebook: 'Facebook : lien en bas de toutes les pages',
    dates_concert: 'Date du concert (page Musique)', lieu_concert: 'Lieu du concert (page Musique)',
    youtube_batisseuse: 'YouTube : documentaire Bâtisseuse (page Audiovisuel). Colle l\'adresse de la vidéo.',
  };
  const PARTAGES = new Set(['image', 'lien', 'n', 'instrumental', 'paysage', 'date', 'langue', 'billets', 'youtube']);
  const MODELES = { concerts: { date: null, lieu: null, billets: null }, clips: { titre: null, youtube: null } }; // listes qui peuvent être vides au départ : forme d'une nouvelle fiche
  const CACHES = new Set(['_note', 'langue', 'n']);
  const LONGS = new Set(['resume', 'texte', 'intro', 'paroles', 'p', 'kolam_txt', 'meta_description', 'sous_titre', 'detail', 'image_alt', 'sens']);

  // Libellés précis selon la partie du site : chaque champ dit où il apparaît (jamais de nom de code).
  const ETIQ_SEC = {
    ui: {
      menu_ouvrir: "Menu : texte du bouton qui ouvre le menu (lu par les lecteurs d'écran)", menu_fermer: "Menu : texte du bouton qui ferme le menu (lecteurs d'écran)",
      menu_nav: "Menu : nom du menu (lecteurs d'écran)", langue: "Choix de la langue : nom (lecteurs d'écran)", passer: "Bouton « Passer l'intro »",
      bientot: "Mot affiché quand un contenu n'est pas encore là (« Bientôt »)", retour: "Bas de page : lien de retour vers l'accueil", aller_contenu: "Lien caché « Aller au contenu » (lecteurs d'écran)",
      contact_h: 'Bas de page : titre de la colonne Contact', contact_txt: "Bas de page : texte du contact (par exemple ton adresse e-mail professionnelle)", contact_form: 'Bas de page : phrase sur le formulaire de contact',
      lettre_h: "Bas de page : titre de la colonne Lettre d'information", lettre_txt: "Bas de page : texte de la lettre d'information", pages_h: 'Bas de page : titre de la liste des pages',
      reseaux_h: 'Bas de page : titre des réseaux sociaux', mentions: 'Bas de page : lien « Mentions légales »',
      sans_js: 'Message si le navigateur bloque JavaScript', erreur: 'Message si le contenu ne se charge pas', lire_video: 'Lecteur de vidéo : texte du bouton',
      video_note: 'Lecteur de vidéo : phrase sous le lecteur (confidentialité YouTube)', ecouter_h: 'Page Musique : titre « Écouter et suivre »',
      youtube: 'Nom du bouton YouTube', spotify: 'Nom du bouton Spotify', billets: 'Page Musique : nom du lien de billetterie', amazon: "Page Écriture : texte du bouton d'achat du livre",
      instagram: 'Bas de page : nom du lien Instagram', facebook: 'Bas de page : nom du lien Facebook', visuel_bientot: "Texte « Visuel bientôt » (pas utilisé pour l'instant)", paroles_bientot: 'Page Musique : texte quand les paroles ne sont pas encore là',
    },
    nav: (c) => ({ accueil: 'Accueil', rvl: 'Musique (RVL)', ecriture: 'Écriture', audiovisuel: 'Audiovisuel', services: 'Services', oriana: 'Oriana' }[c] ? `Menu : nom de la page « ${{ accueil: 'Accueil', rvl: 'Musique (RVL)', ecriture: 'Écriture', audiovisuel: 'Audiovisuel', services: 'Services', oriana: 'Oriana' }[c]} »` : null),
    accueil: { aria_dessin: "Description du dessin de l'ange (lecteurs d'écran)", aria_oriana: "Description du bouton « Oriana » de l'ange (lecteurs d'écran)" },
    site: { nom: 'Ton nom (affiché sur le site)', metier: 'Ton métier', ville: 'Ta ville' },
    page_404: { titre: 'Titre de la page introuvable', texte: 'Texte de la page introuvable', lien: 'Texte du lien de retour' },
    mentions: { h: 'Titre de la section', p: 'Paragraphes de la section' },
    rvl: {
      concerts: 'Concerts à venir (un par date : « Bientôt » disparaît dès qu\'il y en a un)', date: 'Date et heure (ex : samedi 12 décembre 2026, 20h)', lieu: 'Lieu (salle, ville)', billets: 'Adresse de la billetterie (commence par https://), laisse vide si entrée libre',
      clips: 'Clips (un lecteur YouTube par clip : « Clips : bientôt » disparaît dès qu\'il y en a un)', titre: 'Titre', youtube: 'Vidéo YouTube : colle l\'adresse de la vidéo',
      titres_h: 'Titre de la liste des titres', clip_bientot: 'Texte dans le cadre vide du clip (avant la vidéo)', credit_label: 'Rôle du crédit (ex. Arrangeur-piano)', credit: 'Nom du crédit' },
    services: { contact_txt: 'Texte du contact (par exemple ton adresse e-mail professionnelle)', contact_form: 'Phrase sur le formulaire de contact', plaquette: 'Phrase sur la plaquette de services' },
  };
  return { SECTIONS, GOOGLE, BLOCS, ETIQ, NOM_ELEMENT, SECTION_NOM, LIENS_ETIQ, PARTAGES, MODELES, CACHES, LONGS, ETIQ_SEC, COULEURS, POLICES, ROLES, ECHELLES, DEPOT };
})();
