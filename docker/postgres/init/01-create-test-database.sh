#!/bin/bash
# Runs once, on first cluster creation. POSTGRES_DB already created animalesko_dev;
# this adds the database the integration suite owns and resets between runs.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE animalesko_test OWNER $POSTGRES_USER;
	COMMENT ON DATABASE animalesko_test IS 'Owned by the integration suite. Dropped and re-migrated on demand.';
EOSQL

echo "[init] created animalesko_test"
