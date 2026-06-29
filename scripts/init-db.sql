-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Application DB role used by the API (with RLS enforcement)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ontime_app') THEN
    CREATE ROLE ontime_app LOGIN PASSWORD 'ontime_app_password';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE ontime TO ontime_app;
GRANT USAGE ON SCHEMA public TO ontime_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ontime_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ontime_app;
