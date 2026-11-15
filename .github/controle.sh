#!/usr/bin/env bash
# Contrôle avant publication du site d'Oriana : bloque e-mails non prévus, téléphones, clés et jetons,
# fichiers de travail (références, maquettes, archives, documents Word) et PDF qui contiennent un contact.
# Autonome : le dossier est un argument. Aucun nom de personne ici (le dépôt est public).
#
# Usage :
#   bash .github/controle.sh [dossier]   code retour 0 = propre, 1 = bloqué, 2 = erreur d'usage
#   bash .github/controle.sh --autotest  cas témoins positifs et négatif sur un dossier temporaire
#
# E-mails autorisés (par exemple l'adresse de contact professionnelle) : une par ligne dans
# .github/emails_autorises.txt (lignes commençant par # ignorées). Vide par défaut = aucun e-mail accepté.

RE_MAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
RE_TEL='(^|[^0-9.,/-])(((\+ ?33|0033)[ .-]?[1-9]|0[1-9])([ .-]?[0-9]{2}){4}|\+ ?[0-9]{1,3}([ .-]?[0-9]{2,4}){3,})([^0-9]|$)'
RE_JETON='\b(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,})\b'
RE_CLE='-----BEGIN [A-Z ]*PRIVATE KEY-----'
RE_SECRET='(password|passwd|mot de passe|secret|token|api[_-]?key)[^A-Za-z0-9]{0,3}[:=][^][A-Za-z0-9]{0,3}[A-Za-z]*[0-9_/+-][A-Za-z0-9_/+-]{4,}'

controle() { # $1 = dossier
  local dir="$1" rc=0 out autorises f txt
  autorises="$dir/.github/emails_autorises.txt"

  # 1. Fichiers de travail interdits
  out=$(find "$dir" -not -path "$dir/.git/*" -type f \( -ipath '*/references/*' -o -ipath '*/etape*' -o -ipath '*/archives/*' \
        -o -iname '*.docx' -o -iname '*.doc' -o -iname '*.xlsx' -o -iname '*.zip' -o -iname 'telecharger.sh' \
        -o -iname 'capture*' -o -iname 'planche*' -o -iname 'PROMPT_*' \) | sed "s#^$dir/##")
  if [ -n "$out" ]; then echo "== fichier de travail interdit"; echo "$out"; rc=1; fi

  # 2. E-mails non autorisés (les licences de polices sont exclues)
  out=$(grep -rnIoE --exclude-dir=.git --exclude-dir=polices --exclude=controle.sh --exclude=emails_autorises.txt -e "$RE_MAIL" "$dir" | sed "s#^$dir/##")
  if [ -n "$out" ] && [ -f "$autorises" ]; then
    local liste; liste=$(grep -vE '^\s*(#|$)' "$autorises" | tr -d '\r')
    [ -n "$liste" ] && out=$(echo "$out" | grep -viFf <(echo "$liste"))
  fi
  if [ -n "$out" ]; then echo "== adresse e-mail non autorisée"; echo "$out"; rc=1; fi

  # 3. Téléphones (hors dessins SVG et polices)
  out=$(grep -rnIE --exclude-dir=.git --exclude='*.svg' --exclude='*.woff2' --exclude=controle.sh -e "$RE_TEL" "$dir" | grep -v ' d="M' | sed "s#^$dir/##" | cut -c1-160)
  if [ -n "$out" ]; then echo "== numéro de téléphone"; echo "$out"; rc=1; fi

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
    local m
    m=$(echo "$txt" | grep -oE "$RE_MAIL")
    if [ -n "$m" ] && [ -f "$autorises" ]; then
      m=$(echo "$m" | grep -viFf <(grep -vE '^\s*(#|$)' "$autorises" | tr -d '\r'))
    fi
    [ -n "$m" ] && { echo "== PDF contenant un e-mail non autorisé : ${f#$dir/}"; rc=1; }
    echo "$txt" | grep -qE "$RE_TEL" && { echo "== PDF contenant un téléphone : ${f#$dir/}"; rc=1; }
    echo "$txt" | grep -qE "$RE_JETON" && { echo "== PDF contenant un jeton : ${f#$dir/}"; rc=1; }
  done < <(find "$dir" -not -path "$dir/.git/*" -type f -iname '*.pdf')

  [ $rc -eq 0 ] && echo "OK : rien de suspect détecté (relire le diff quand même)."
  return $rc
}

autotest() {
  local t ok=0 faux
  t=$(mktemp -d) || exit 2
  mkdir -p "$t/propre/.github" "$t/mail/.github" "$t/tel1" "$t/tel2" "$t/tel3" "$t/jeton" "$t/fichier/references" "$t/autorise/.github"
  printf '<p>Un texte.</p>\n<path d="M63.89 75.09L63.89 75.09Q62.12 75.09 60.33 74.15"/>\n' > "$t/propre/a.html"
  echo "ecrire a prenom.nom@exemple.org" > "$t/mail/a.md"
  echo "appeler le 06 12 34 56 78" > "$t/tel1/a.md"
  echo "appeler le +33 6 12 34 56 78" > "$t/tel2/a.md"
  printf 'appeler le 06.%s.34.56.78\n' 12 > "$t/tel3/a.md"   # construit à l'exécution (évite une fausse alerte du contrôle d'adresses IP)
  faux="github_pat_$(printf 'Q%.0s' {1..40})"; echo "cle=$faux" > "$t/jeton/a.md"
  echo x > "$t/fichier/references/a.png"
  echo "contact: pro@exemple.org" > "$t/autorise/a.md"; echo "pro@exemple.org" > "$t/autorise/.github/emails_autorises.txt"
  controle "$t/propre" >/dev/null;  [ $? -eq 0 ] && echo "PASS négatif : propre accepté (dessin SVG compris)" || { echo "FAIL négatif"; ok=1; }
  controle "$t/autorise" >/dev/null; [ $? -eq 0 ] && echo "PASS négatif : e-mail autorisé accepté" || { echo "FAIL e-mail autorisé"; ok=1; }
  for c in mail tel1 tel2 tel3 jeton fichier; do
    controle "$t/$c" >/dev/null;    [ $? -eq 1 ] && echo "PASS positif : $c bloqué" || { echo "FAIL positif : $c NON détecté"; ok=1; }
  done
  rm -rf "$t"; exit $ok
}

case "${1:-}" in
  --autotest) autotest ;;
  -h|--help) sed -n '2,12p' "$0"; exit 2 ;;
  *) d="${1:-.}"; [ -d "$d" ] || { echo "ERREUR : dossier introuvable : $d"; exit 2; }
     controle "$(cd "$d" && pwd)"; exit $? ;;
esac
