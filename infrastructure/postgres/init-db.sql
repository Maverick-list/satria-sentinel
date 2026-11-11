-- SATRIA SENTINEL PostgreSQL initialization script
-- Ensures UTC timezone default for security telemetry and audit timestamps.
ALTER DATABASE satria_sentinel_db SET timezone TO 'UTC';
