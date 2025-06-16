-- Create schedule_items table for breaks and preparation time
CREATE TABLE IF NOT EXISTS schedule_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('break', 'preparation')),
  title VARCHAR(255) NOT NULL,
  start_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- duration in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on project_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_schedule_items_project_id ON schedule_items(project_id);

-- Create index on start_time for sorting
CREATE INDEX IF NOT EXISTS idx_schedule_items_start_time ON schedule_items(start_time);