#!/bin/sh
# First start of the Postgres volume only: the identity schema and the role
# that owns it. Same as go-identity's deploy/sql/bootstrap.sql.
set -e
psql -v ON_ERROR_STOP=1 -v identity_password="$IDENTITY_DB_PASSWORD" \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
SELECT format('CREATE ROLE identity LOGIN PASSWORD %L', :'identity_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'identity')
\gexec
CREATE SCHEMA IF NOT EXISTS identity AUTHORIZATION identity;
ALTER ROLE identity SET search_path = identity;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL
