-- Add after-party (打ち上げ) fields to projects table
-- Run this migration in the Supabase SQL Editor

ALTER TABLE projects ADD COLUMN IF NOT EXISTS has_after_party boolean DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS after_party_start_time text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS after_party_location text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS after_party_address text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS after_party_map_url text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS after_party_note text;
