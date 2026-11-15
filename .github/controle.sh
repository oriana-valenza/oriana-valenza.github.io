#!/usr/bin/env bash
# Contrôle avant publication du site d'Oriana : bloque e-mails et téléphones non voulus, clés et jetons,
# fichiers de travail (références, maquettes, archives, documents Word) et PDF qui contiennent un contact.
# Autonome : le dossier est un argument. Aucun nom de personne ici (le dépôt est public).
#
# Usage :
#   bash .github/controle.sh [dossier]   code retour 0 = propre, 1 = bloqué, 2 = erreur d'usage
#   bash .github/controle.sh --autotest  cas témoins positifs et négatifs sur un dossier temporaire
#
# Contacts voulus (liste blanche, VIDE par défaut) : .github/contacts_autorises.txt, une ligne par contact :
#   valeur | étiquette        (exemple : contact@exemple.org | contact pro)
# Les lignes qui commencent par # sont ignorées. L'éditeur du site ajoute les lignes à la demande d'Oriana.
#
# DÉBRAYAGE : si ce contrôle empêchait de publier et que personne ne peut le corriger, le désactiver
# (voir l'aide du site, « Si le contrôle bloque tout ») : supprimer .github/workflows/controle.yml
# ou, dans GitHub, Settings > Actions > General > Disable actions. L'éditeur le détecte et publie sans l'attendre.

RE_MAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
RE_TEL='(^|[^0-9.,/-])(((\+ ?33|0033)[ .-]?[1-9]|0[1-9])([ .-]?[0-9]{2}){4}|\+ ?[0-9]{1,3}([ .-]?[0-9]{2,4}){3,})([^0-9]|$)'
RE_JETON='\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,})\b'
RE_CLE='-----BEGIN [A-Z ]*PRIVATE KEY-----'
RE_SECRET='(password|passwd|mot de passe|secret|token|api[_-]?key)[^A-Za-z0-9]{0,3}[:=][^][A-Za-z0-9]{0,3}[A-Za-z]*[0-9_/+-][A-Za-z0-9_/+-]{4,}'

AUTORISES=""

valeurs_autorisees() { # valeurs de la liste blanche (avant le « | »), une par ligne
  [ -f "$AUTORISES" ] || return 0
  grep -vE '^[[:space:]]*(#|$)' "$AUTORISES" | tr -d '\r' | cut -d'|' -f1 | sed -E 's/^[[:space:]]+|[[:space:]]+$//g'
}
norm_tel() { tr -cd '0-9' | sed -E 's/^(0033|33)([1-9])/0\2/'; }

mails_refuses() { # texte sur l'entrée : affiche les e-mails non autorisés
  local m; m=$(grep -oE "$RE_MAIL")
  [ -z "$m" ] && return 0
  local v; v=$(valeurs_autorisees)
  if [ -n "$v" ]; then echo "$m" | grep -viFf <(echo "$v"); else echo "$m"; fi
  return 0
}

tels_refuses() { # texte sur l'entrée : affiche les téléphones non autorisés
  local m wl d
  wl=$(valeurs_autorisees | while IFS= read -r x; do printf '%s\n' "$(printf '%s' "$x" | norm_tel)"; done)
  while IFS= read -r m; do
    [ -z "$m" ] && continue
    d=$(printf '%s' "$m" | norm_tel)
    printf '%s\n' "$wl" | grep -qxF "$d" || echo "$m"
  done < <(grep -oE "$RE_TEL")
  return 0
}

controle() { # $1 = dossier
  local dir="$1" rc=0 out f txt l c
  AUTORISES="$dir/.github/contacts_autorises.txt"

  # 1. Fichiers de travail interdits
  out=$(find "$dir" -not -path "$dir/.git/*" -type f \( -ipath '*/references/*' -o -ipath '*/etape*' -o -ipath '*/archives/*' \
        -o -iname '*.docx' -o -iname '*.doc' -o -iname '*.xlsx' -o -iname '*.zip' -o -iname 'telecharger.sh' \
        -o -iname 'capture*' -o -iname 'planche*' -o -iname 'PROMPT_*' \) | sed "s#^$dir/##")
  if [ -n "$out" ]; then echo "== fichier de travail interdit"; echo "$out"; rc=1; fi

  # 2. E-mails non autorisés (les licences de polices sont exclues)
  out=""
  while IFS= read -r l; do
    [ -z "$l" ] && continue
    c="${l#*:*:}"
    [ -n "$(printf '%s\n' "$c" | mails_refuses)" ] && out+="$l"$'\n'
  done < <(grep -rnIE --exclude-dir=.git --exclude-dir=polices --exclude=controle.sh --exclude=contacts_autorises.txt -e "$RE_MAIL" "$dir" | sed "s#^$dir/##" | cut -c1-200)
  if [ -n "$out" ]; then echo "== adresse e-mail non autorisée"; printf '%s' "$out"; rc=1; fi

  # 3. Téléphones non autorisés (hors dessins SVG et polices)
  out=""
  while IFS= read -r l; do
    [ -z "$l" ] && continue
    c="${l#*:*:}"
    [ -n "$(printf '%s\n' "$c" | tels_refuses)" ] && out+="${l:0:160}"$'\n'
  done < <(grep -rnIE --exclude-dir=.git --exclude='*.svg' --exclude='*.woff2' --exclude=controle.sh --exclude=contacts_autorises.txt -e "$RE_TEL" "$dir" | grep -v ' d="M' | sed "s#^$dir/##")
  if [ -n "$out" ]; then echo "== numéro de téléphone non autorisé"; printf '%s' "$out"; rc=1; fi

  # 4. Clés, jetons et secrets
  secrets() { # $1 = description, $2 = regex
    out=$(grep -rnIiE --exclude-dir=.git --exclude=controle.sh -e "$2" "$dir" | sed "s#^$dir/##" | cut -c1-160)
    if [ -n "$out" ]; then echo "== $1"; echo "$out"; rc=1; fi
  }
  secrets "jeton ou clé connu" "$RE_JETON"
  secrets "clé privée" "$RE_CLE"
  secrets "secret probable" "$RE_SECRET"

  # 5. PDF : on lit le texte (un PDF non lisible est refusé : on ne dit pas « propre » sans avoir cherché)
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if ! command -v pdftotext >/dev/null 2>&1; then
      echo "== PDF non vérifié (pdftotext absent) : ${f#$dir/}"; rc=1; continue
    fi
    txt=$(pdftotext -q "$f" - 2>/dev/null)
    if [ -z "$txt" ]; then echo "== PDF sans texte lisible (image scannée ?) : ${f#$dir/}"; rc=1; continue; fi
    [ -n "$(printf '%s\n' "$txt" | mails_refuses)" ] && { echo "== PDF contenant un e-mail non autorisé : ${f#$dir/}"; rc=1; }
    [ -n "$(printf '%s\n' "$txt" | tels_refuses)" ] && { echo "== PDF contenant un téléphone non autorisé : ${f#$dir/}"; rc=1; }
    printf '%s\n' "$txt" | grep -qE "$RE_JETON" && { echo "== PDF contenant un jeton : ${f#$dir/}"; rc=1; }
  done < <(find "$dir" -not -path "$dir/.git/*" -type f -iname '*.pdf')

  # 6. Feuille de style du thème (écrite par l'éditeur d'apparence) : seulement des lignes --variable:valeur dans :root{ }
  if [ -f "$dir/css/theme.css" ]; then
    out=$(sed -E 's#/\*.*\*/##g' "$dir/css/theme.css" | tr -d '\r' | grep -vE '^[[:space:]]*$' | grep -vE '^:root\{$|^\}$|^--[a-z0-9-]+:(#[0-9A-Fa-f]{6}|[0-9]{1,3},[0-9]{1,3},[0-9]{1,3});$|^--(titre|texte|titre-musique):"[A-Za-z0-9 ]{2,40}",[A-Za-z-]+(,[A-Za-z-]+){0,2};$|^--(musique-)?echelle:[0-9](\.[0-9]{1,2})?;$|^@font-face\{font-family:"[A-Za-z0-9 ]{2,40}";font-weight:[0-9]{3,4}( [0-9]{3,4})?;src:url\("\.\./polices/[a-z0-9-]+\.(woff2|woff|ttf|otf)"\) format\("(woff2|woff|truetype|opentype)"\);font-display:swap\}$' | head -5)
    if [ -n "$out" ]; then echo "== css/theme.css : contenu non autorisé (seuls sont permis : --variable:#RRGGBB;, polices du catalogue, échelles et @font-face locaux de polices/)"; echo "$out"; rc=1; fi
    for p in $(grep -oE 'polices/[a-z0-9-]+\.(woff2|woff|ttf|otf)' "$dir/css/theme.css"); do   # chaque fichier de police cité doit exister
      [ -f "$dir/$p" ] || { echo "== css/theme.css : fichier de police absent : $p"; rc=1; }
    done
  fi
  # 7. Polices déposées par l'éditeur (polices/depot-*) : 300 Ko au plus et vraie signature de police (wOF2, wOFF, OTTO, true, 00010000)
  if [ -d "$dir/polices" ]; then
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      [ "$(wc -c < "$f")" -gt 307200 ] && { echo "== police déposée trop lourde (> 300 Ko) : ${f#$dir/}"; rc=1; }
      case "$(head -c4 "$f" | od -An -tx1 | tr -d ' \n')" in 774f4632|774f4646|4f54544f|74727565|00010000) ;; *) echo "== police déposée : ce n'est pas une police : ${f#$dir/}"; rc=1 ;; esac
    done < <(find "$dir/polices" -type f -name 'depot-*')
  fi

  [ $rc -eq 0 ] && echo "OK : rien de suspect détecté (relire le diff quand même)."
  return $rc
}

autotest() {
  local t ok=0 faux c
  t=$(mktemp -d) || exit 2
  for d in propre mail tel1 tel2 tel3 jeton fichier/references ok_mail ok_tel autre_tel theme_ok theme_url theme_import theme_bloc font_ok font_distant font_chemin font_absent font_regle; do mkdir -p "$t/$d/.github"; done
  printf '<p>Un texte.</p>\n<path d="M63.89 75.09L63.89 75.09Q62.12 75.09 60.33 74.15"/>\n' > "$t/propre/a.html"
  echo "ecrire a prenom.nom@exemple.org" > "$t/mail/a.md"
  echo "appeler le 06 12 34 56 78" > "$t/tel1/a.md"
  echo "appeler le +33 6 12 34 56 78" > "$t/tel2/a.md"
  printf 'appeler le 06.%s.34.56.78\n' 12 > "$t/tel3/a.md"   # construit à l'exécution (évite une fausse alerte du contrôle d'adresses IP)
  faux="github_pat_$(printf 'Q%.0s' {1..40})"; echo "cle=$faux" > "$t/jeton/a.md"
  echo x > "$t/fichier/references/a.png"
  echo "contact: pro@exemple.org" > "$t/ok_mail/a.md"; printf '# liste\npro@exemple.org | contact pro\n' > "$t/ok_mail/.github/contacts_autorises.txt"
  echo "tel: +33 6 12 34 56 78" > "$t/ok_tel/a.md"; printf '06 12 34 56 78 | contact pro\n' > "$t/ok_tel/.github/contacts_autorises.txt"
  echo "tel: 07 98 76 54 32" > "$t/autre_tel/a.md"; printf '06 12 34 56 78 | contact pro\n' > "$t/autre_tel/.github/contacts_autorises.txt"
  mkdir -p "$t/theme_ok/css" "$t/theme_url/css" "$t/theme_import/css" "$t/theme_bloc/css"
  printf '/* theme */\n:root{\n--bg:#112233;\n--bg-rgb:17,34,51;\n}\n' > "$t/theme_ok/css/theme.css"
  printf ':root{\n--bg:url(https://exemple.org/x.png);\n}\n' > "$t/theme_url/css/theme.css"
  printf '@import "https://exemple.org/x.css";\n' > "$t/theme_import/css/theme.css"
  printf 'body{display:none}\n' > "$t/theme_bloc/css/theme.css"
  mkdir -p "$t/font_ok/css" "$t/font_ok/polices" "$t/font_distant/css" "$t/font_chemin/css" "$t/font_absent/css" "$t/font_regle/css" "$t/font_regle/polices"
  ff='@font-face{font-family:"Lora";font-weight:400 700;src:url("../polices/lora-x.woff2") format("woff2");font-display:swap}'
  printf '%s\n:root{\n--titre:"Lora",Georgia,serif;\n--musique-echelle:0.42;\n--echelle:1.12;\n}\n' "$ff" > "$t/font_ok/css/theme.css"; echo x > "$t/font_ok/polices/lora-x.woff2"
  printf '@font-face{font-family:"Lora";font-weight:400;src:url("https://exemple.org/lora.woff2") format("woff2");font-display:swap}\n' > "$t/font_distant/css/theme.css"
  printf '@font-face{font-family:"Lora";font-weight:400;src:url("../polices/../../x.woff2") format("woff2");font-display:swap}\n' > "$t/font_chemin/css/theme.css"
  printf '%s\n' "$ff" > "$t/font_absent/css/theme.css"
  printf '@font-face{font-family:"Lora";font-weight:400;src:url("../polices/lora-x.woff2") format("woff2");font-display:swap;unicode-range:U+0}\n' > "$t/font_regle/css/theme.css"; echo x > "$t/font_regle/polices/lora-x.woff2"
  mkdir -p "$t/depot_ok/css" "$t/depot_ok/polices" "$t/depot_gros/polices" "$t/depot_faux/polices"
  printf '@font-face{font-family:"Ma Police";font-weight:400;src:url("../polices/depot-ma-police.ttf") format("truetype");font-display:swap}\n' > "$t/depot_ok/css/theme.css"
  printf '\000\001\000\000abcdef' > "$t/depot_ok/polices/depot-ma-police.ttf"
  { printf 'wOF2'; head -c 320000 /dev/zero; } > "$t/depot_gros/polices/depot-grosse.woff2"
  echo "ceci est un texte, pas une police" > "$t/depot_faux/polices/depot-fausse.woff2"
  for c in propre ok_mail ok_tel theme_ok font_ok depot_ok; do
    controle "$t/$c" >/dev/null; [ $? -eq 0 ] && echo "PASS négatif : $c accepté" || { echo "FAIL négatif : $c refusé à tort"; ok=1; }
  done
  for c in mail tel1 tel2 tel3 jeton fichier autre_tel theme_url theme_import theme_bloc font_distant font_chemin font_absent font_regle depot_gros depot_faux; do
    controle "$t/$c" >/dev/null; [ $? -eq 1 ] && echo "PASS positif : $c bloqué" || { echo "FAIL positif : $c NON détecté"; ok=1; }
  done
  rm -rf "$t"; exit $ok
}

case "${1:-}" in
  --autotest) autotest ;;
  -h|--help) sed -n '2,19p' "$0"; exit 2 ;;
  *) d="${1:-.}"; [ -d "$d" ] || { echo "ERREUR : dossier introuvable : $d"; exit 2; }
     controle "$(cd "$d" && pwd)"; exit $? ;;
esac
