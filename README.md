# Site d'Oriana Valenza

Adresse : https://oriana-valenza.github.io/

Site fait de fichiers simples (HTML, CSS, JavaScript, JSON), sans outil de fabrication : on peut tout modifier avec un éditeur de texte. Aucun cookie, aucun traceur, aucune ressource distante.

## Où sont les textes

- `donnees/fr.json` : tous les textes en français. `donnees/en.json` : tous les textes en anglais (même structure).
- `donnees/bio-fr.md` et `donnees/bio-en.md` : la biographie (un paragraphe = un bloc séparé par une ligne vide).
- `donnees/liens.json` : les liens (YouTube, Spotify, Amazon, billets, Instagram, Facebook, date et lieu du concert). `null` = pas encore fourni, le site affiche « Bientôt ». Pour YouTube, mettre seulement l'identifiant de la vidéo (11 caractères). Seuls les liens `https://` sont acceptés.

## Paroles des morceaux (page RVL)

Chaque titre de l'EP (sauf Interlude, instrumental) est un bouton qui déplie un panneau. Pour ajouter des paroles, dans `donnees/fr.json` et `donnees/en.json`, section `rvl` > `titres`, remplacer `"paroles": null` par le texte entre guillemets ; une ligne vide (`

`) sépare deux strophes, `
` fait un retour à la ligne. Tant que la valeur est `null`, le panneau affiche « Paroles à venir ». Aucun code à toucher.

## Pages Écriture, Audiovisuel, Services

- Écriture : `oeuvres` (titre, `etat`, `resume`, `lien`, `image` = nom de fichier dans `img/`, `image_alt`).
- Audiovisuel : `parties` (chaque partie a un titre `h` et une liste `films` : `titre`, `texte`, `infos` = lignes en plus, `lien` = clé de `liens.json` pour YouTube, `image`, `image_alt`). Pour ajouter la vidéo de Bâtisseuse : mettre l'identifiant YouTube dans `youtube_batisseuse` de `donnees/liens.json`.
- Le cœur de la page Audiovisuel bat doucement (halo doré, cycle de 1,6 s, sans clignotement) ; arrêté si le visiteur a demandé moins d'animations.

## Modifier un texte

1. Ouvrir `donnees/fr.json` (et `donnees/en.json`), changer le texte entre guillemets, ne pas toucher aux clés (à gauche des deux-points).
2. Enregistrer, recharger la page. Attention : un guillemet droit `"` dans un texte s'écrit `\"`.

## Tester sur son ordinateur

Dans le dossier du site :

```bash
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000/ (l'ouverture directe d'un fichier ne marche pas, les textes sont chargés par le navigateur).

## Langue

Français par défaut ; `?lang=en` à la fin de l'adresse pour l'anglais. Le bouton FR / EN mémorise le choix dans le navigateur (stockage local, rien n'est envoyé).

## Structure

- `index.html` : accueil (l'ange est le menu). `oriana/`, `rvl/`, `ecriture/`, `audiovisuel/`, `services/`, `mentions-legales/`, `404.html`.
- `css/`, `js/` : mise en page et comportements (`js/pages.js` contient les gabarits de pages et l'intro animée).
- `img/` : ange, symboles (`img/symboles/`), portrait, couvertures, photos des projets (WebP), image de partage. Aucun PDF dans le dépôt. L'ange (`img/ange.svg`) est provisoire : le remplacer par la version finale en gardant le même nom et le même repère (viewBox `-640 90 1280 2200`).
- `polices/` : Petit Formal Script et Montserrat, avec leurs licences (OFL).
- `sitemap.xml`, `robots.txt`, `favicon.svg`, `.nojekyll`.

## Intro animée

Chaque page projet démarre par une intro de 4 à 5 secondes (le symbole se trace puis s'allume). Un bouton « Passer l'intro » (ou un clic, ou la touche Échap) l'arrête. Elle est désactivée si le visiteur a demandé moins d'animations dans son système. Aucun clignotement.

## Publier

Avant chaque envoi, contrôle anti-secrets (aucun résultat attendu, hors licences des polices) :

```bash
grep -rniE "password|mot de passe|token|secret|apikey" . --exclude-dir=.git | head
find . -not -path "./.git/*" -iname "*.pdf"
```

Puis, fichier par fichier :

```bash
git add index.html
git commit -m "Message en français : quoi et pourquoi"
git push origin main
```

GitHub Pages : Settings > Pages > Deploy from a branch > `main` / racine.

## À compléter avant la mise en ligne

Nom de l'éditeur, adresse et contact (`donnees/*.json`, section `mentions` ; le SIRET est renseigné), adresse de contact, liens, relecture de l'anglais et de la biographie par Oriana, relecture juridique des mentions légales.
