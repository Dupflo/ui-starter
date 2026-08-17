#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Backup COMPLET de la Supabase prod Applyzi (offre free = pas de backup managé).
# Fait un pg_dump du schéma `public` (toutes les tables + données + fonctions/RLS),
# soit exactement ce que le rebuild s'apprête à modifier. À lancer AVANT tout DROP.
#
# ── Comment l'utiliser ──────────────────────────────────────────────────────
# 1. Récupère l'URI de connexion :
#      Supabase Dashboard → ton projet "Applyzi" → Project Settings → Database
#      → Connection string → onglet "URI" → mode **Session pooler** (port 5432).
#      ⚠ PAS le mode "Transaction" (port 6543) : pg_dump ne marche pas dessus.
#      L'URI contient déjà ton mot de passe.
# 2. Dans ton terminal (le mot de passe reste chez toi, ce script ne le stocke pas) :
#      export SUPABASE_DB_URL='postgresql://postgres.cabaknozrdvjubxgpyoi:TON_MDP@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
# 3. Lance :
#      bash scripts/backup-prod.sh
#
# Sortie : ./backups/applyzi-prod-<timestamp>.sql.gz
# Restore éventuel : gunzip -c backups/applyzi-prod-<ts>.sql.gz | psql "$SUPABASE_DB_URL"
# ============================================================================

: "${SUPABASE_DB_URL:?Définis SUPABASE_DB_URL d'abord (voir l'en-tête de ce script).}"

# Le serveur est en PostgreSQL 17 → pg_dump doit être >= 17, sinon il refuse.
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "✗ pg_dump introuvable. Installe-le : brew install postgresql@17"
  echo "  puis : export PATH=\"\$(brew --prefix postgresql@17)/bin:\$PATH\""
  exit 1
fi
PGD_MAJOR="$(pg_dump --version | grep -oE '[0-9]+' | head -1)"
if [ "${PGD_MAJOR:-0}" -lt 17 ]; then
  echo "✗ pg_dump $PGD_MAJOR trop ancien (serveur = PG 17)."
  echo "  brew install postgresql@17 && export PATH=\"\$(brew --prefix postgresql@17)/bin:\$PATH\""
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/applyzi-prod-$TS.sql.gz"

echo "→ Dump du schéma public (schema + data) vers $OUT ..."
# --no-owner/--no-privileges : restore portable. --schema=public : on sauvegarde ce
# qui est à risque (les tables public). auth.users & co ne sont pas touchés par le rebuild.
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --no-owner \
  --no-privileges \
  --quote-all-identifiers \
  | gzip > "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
ROWS_NOTE="(vérifie que la taille est cohérente — pas quelques Ko)"
echo ""
echo "✓ Backup terminé : $OUT ($SIZE) $ROWS_NOTE"
echo "  Pour vérifier le contenu : gunzip -c \"$OUT\" | head -40"
echo "  Pour restaurer plus tard : gunzip -c \"$OUT\" | psql \"\$SUPABASE_DB_URL\""
