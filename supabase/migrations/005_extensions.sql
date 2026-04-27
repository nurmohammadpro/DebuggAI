-- 001_extensions.sql
-- Enable required PostgreSQL extensions for DeBuggAI
-- Execution Order: 1st (before all other migrations)

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search and trigram matching
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- btree_gin for array indexing
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
