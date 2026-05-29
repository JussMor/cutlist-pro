-- Create studio_documents table for the Studio redesign authoring documents
CREATE TABLE IF NOT EXISTS studio_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  document TEXT NOT NULL,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_at_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_studio_documents_updated_at ON studio_documents(updated_at DESC);
