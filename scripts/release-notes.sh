#!/bin/sh
# Prints the GitHub Release notes for a version: its category and its CHANGELOG.md entry.
# Usage: sh scripts/release-notes.sh 0.98.4        (also used by .github/workflows/version-tags.yml)
# Two releases once shared 0.94.0: "0.94.0" is the "You're set" sky fix, "0.94.0-health" the health-answer hold.
v="$1"; [ -n "$v" ] || { echo "usage: release-notes.sh <version>" >&2; exit 1; }
base="${v%%-*}"
cat=$(grep -v '^#' scripts/version-tags.tsv | awk -F'\t' -v v="$v" '$1==v{print $3}')
# every CHANGELOG heading for this base version, in file order
if [ "$v" = "0.94.0" ]; then pick=last; elif [ "$v" = "0.94.0-health" ]; then pick=first; else pick=first; fi
awk -v base="$base" -v pick="$pick" '
  /^## /{ inb=0; if ($2==base) { n++; heads[n]=NR } }
  { line[NR]=$0 } END {
    s = (pick=="last") ? heads[n] : heads[1]
    if (!s) exit 1
    for (i=s+1; i<=NR && line[i] !~ /^## /; i++) print line[i]
  }' CHANGELOG.md > "${TMPDIR:-/tmp}/rn.$$" || { echo "No changelog entry found for $v."; rm -f "${TMPDIR:-/tmp}/rn.$$"; exit 0; }
[ -n "$cat" ] || cat=$(sed -n 's/^- \*\*\([a-z]*\)\*\*.*/\1/p' "${TMPDIR:-/tmp}/rn.$$" | head -1)
[ -n "$cat" ] && printf 'Category: **%s**\n' "$cat"
cat "${TMPDIR:-/tmp}/rn.$$"; rm -f "${TMPDIR:-/tmp}/rn.$$"
printf '\nFull history: [CHANGELOG.md](https://github.com/KingTBO/Lightly-Fasting-App-Project/blob/main/CHANGELOG.md)\n'
