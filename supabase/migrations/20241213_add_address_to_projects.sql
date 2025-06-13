-- Add address column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS address TEXT;

-- Update existing projects to have an empty address if needed
UPDATE projects
SET address = ''
WHERE address IS NULL;