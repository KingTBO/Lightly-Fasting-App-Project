#!/bin/bash
# Runs the weight comparison database tests on a throwaway local Postgres (no Supabase needed).
#   scripts/test-trend-db.sh            uses the Postgres on PGHOST/PGPORT
# Needs: psql and a Postgres server you may create a database on. The test database is created and dropped each run.
set -e
cd "$(dirname "$0")/.."
DB=lightly_trend_test
run(){ psql -X -v ON_ERROR_STOP=1 -q "$@"; }
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
trap 'psql -X -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
run -d $DB -f supabase/tests/stub-supabase.sql
run -d $DB -f supabase/trend.sql
run -d $DB -f supabase/trend.sql   # twice: it must be safe to run again
run -d $DB -f supabase/tests/trend.test.sql
echo "trend database tests: all passed"
