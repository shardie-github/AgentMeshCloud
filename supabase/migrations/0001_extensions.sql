-- Enable required extensions (idempotent)
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists pg_stat_statements;
create extension if not exists vector;             -- pgvector
create extension if not exists pg_net;            -- outbound http if needed
create extension if not exists pg_cron;           -- scheduling
