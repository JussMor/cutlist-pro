-- Create assemblies table for custom and reusable furniture assemblies
CREATE TABLE IF NOT EXISTS assemblies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  panels TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT TRUE,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_at_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_assemblies_updated_at ON assemblies(updated_at DESC);

-- Create index on is_custom for filtering
CREATE INDEX IF NOT EXISTS idx_assemblies_is_custom ON assemblies(is_custom);
