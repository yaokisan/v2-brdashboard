-- Add entry_method (入館方法) field to projects table
-- Run this migration in the Supabase SQL Editor

ALTER TABLE projects ADD COLUMN IF NOT EXISTS entry_method text;
