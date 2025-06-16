-- Add belongings column to performers table
ALTER TABLE performers
ADD COLUMN IF NOT EXISTS belongings TEXT;