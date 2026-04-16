-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_key TEXT NOT NULL,
  params TEXT NOT NULL,
  cut_result TEXT,
  pricing TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_at_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
