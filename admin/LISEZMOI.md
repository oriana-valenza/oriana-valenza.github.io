# Éditeur du site (`/admin/`) : notes pour la personne qui reprend

Page web statique (HTML + JS pur, aucune dépendance, aucune installation) qui permet à Oriana de modifier les textes, liens et photos du site depuis son téléphone. Elle écrit dans ce dépôt par l'API de GitHub avec un « jeton » (fine-grained, limité à ce dépôt) gardé dans le navigateur. Aucune donnée n'est envoyée ailleurs (CSP stricte dans `index.html`).

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html` | Page, CSP (`connect-src` : api.github.com et localhost pour les tests). |
| `libelles.js` | **Le seul fichier à compléter quand un champ est ajouté au site** : `SECTIONS` (menu), `BLOCS` (ordre et titres des blocs d'une page), `ETIQ_SEC` / `ETIQ` (libellé français de chaque champ, qui dit où il apparaît), `MODELES` (forme d'une nouvelle fiche d'une liste vide), `PARTAGES` (champs identiques en FR et EN). |
| `admin.js` | Toute la logique (voir ci-dessous). |
| `admin.css` | Style. Rouge = titres de bloc et boutons ; noir = champs. |
| `aide/` | Page d'aide publique, **générée** depuis l'atelier (`aide/*.md` + `construire.js`) : ne pas l'éditer à la main. |

## Données lues et écrites
`donnees/fr.json`, `en.json`, `liens.json`, `bio-fr.md`, `bio-en.md`, `.github/contacts_autorises.txt` (liste blanche des e-mails et téléphones voulus) et `img/*.webp` (photos). L'anglais est aligné sur la forme du français (`aligner`). **Règle d'interface : aucun nom de code visible** ; un champ sans libellé fait échouer l'Action « Libellés de l'éditeur » (`.github/controle-libelles.js`).

## Publication : mode essai par branche
`pipeline()` dans `admin.js` : 1) lit la tête de `main` ; 2) crée une branche `brouillon-AAAAMMJJHHMMSS` ; 3) envoie chaque fichier (un commit par fichier, message « … (nom de la branche) », unique par publication) ; 4) attend le check **`controle`** (Action `controle.yml`, script `.github/controle.sh` : secrets, e-mails, téléphones, PDF) ; 5) fusionne la branche dans `main` (`POST /merges`) ; 6) supprime la branche. Refus du contrôle = rien n'est publié.
**Débrayage** : si le workflow est absent ou désactivé (ou si le jeton ne peut pas le lire), l'éditeur publie sans l'attendre et le dit. Procédure pour la personne qui dépanne : dernière section de `aide/02-utiliser.md` (page d'aide).

## Annuler et historique
- **Annuler la dernière publication** : relit chaque fichier touché à la tête d'avant (`S.annuler.tete`, gardée dans le navigateur) et republie par le même pipeline.
- **Anciennes versions** (`ecranHistorique`) : liste les commits de `main` (`GET /commits`), regroupe ceux de même message (= une publication), « Revenir à cette version » republie les 6 fichiers édités tels qu'ils étaient (les photos ne sont jamais supprimées). Le retour peut lui-même être annulé.

## API GitHub utilisée (jeton : Contents RW, Actions R, Checks R, Metadata R)
`GET /repos/{o}/{d}` (droit d'écrire, taille du dépôt), `GET/PUT/DELETE …/contents/{chemin}?ref=`, `GET …/git/ref/heads/main`, `POST …/git/refs`, `DELETE …/git/refs/heads/{branche}`, `GET …/actions/workflows`, `GET …/commits/{sha}/check-runs`, `GET …/commits`, `POST …/merges`.

## Tester sans toucher au vrai dépôt (depuis l'atelier privé de Simon)
`oriana-valenza/outils/` (atelier, jamais publié) : `faux-github.js` simule l'API (et exécute le **vrai** `controle.sh`), `test-editeur.js` pilote la vraie page avec Edge sans fenêtre et affiche PASS/FAIL (connexion, ajout, brouillon, publication, annulation, historique, contrôle refusé, débrayage, conflit, renouvellement du jeton).
```
node oriana-valenza/outils/test-editeur.js C:/Dev/oriana-valenza-site
```
Page de test à la main : `node outils/faux-github.js <site> 8000 8001` puis `http://localhost:8000/admin/?api=http://localhost:8001` (jeton : `faux-jeton`). Le paramètre `?api=` n'est accepté que sur `localhost`.
**Avant toute modification de `admin.js` ou `libelles.js` : lancer ce test, et `bash .github/controle.sh --autotest`.**

## Pièges connus
- L'ordre d'arrivée des fichiers au chargement varie : toute comparaison d'empreintes (`S.sha`) se fait dans l'ordre fixe de `FICHIERS` (bug réel corrigé : brouillons perdus au hasard).
- Les validations d'adresse (`billets`, `youtube`) ne s'appliquent qu'aux fiches de listes ; ailleurs ce sont des libellés de texte (bug réel corrigé : publication bloquée).
- Les workflows planifiés de GitHub s'arrêtent après 60 jours sans activité du dépôt ; `sauvegarde.yml` se déclenche aussi à chaque publication sur `main`.
- Le jeton qui publie peut aussi modifier la liste blanche des contacts : garde-fou contre l'accident, pas contre un attaquant.
- Le jeton expire (≤ 1 an) : l'éditeur prévient 30 jours avant ; procédure « Renouveler le jeton » dans l'aide.
