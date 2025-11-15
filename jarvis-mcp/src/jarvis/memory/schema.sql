-- SQLite schema for JARVIS memory system
-- Version: 1.0.0

-- MemoryEntry table (L1 - Factual Memory)
CREATE TABLE IF NOT EXISTS memory_entries (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL,  -- 'decision', 'bug', 'architecture', 'note', 'code_change', 'snapshot'
    file_path TEXT,
    line_start INTEGER,
    line_end INTEGER,
    commit_sha TEXT,
    timestamp REAL NOT NULL,  -- Unix timestamp
    metadata TEXT,  -- JSON string
    tags TEXT,  -- JSON array of strings
    FOREIGN KEY (project_id) REFERENCES project_contexts(id)
);

-- ProjectContext table
CREATE TABLE IF NOT EXISTS project_contexts (
    id TEXT PRIMARY KEY,  -- SHA256 hash of absolute path
    name TEXT NOT NULL,
    root_path TEXT NOT NULL UNIQUE,
    tech_stack TEXT,  -- JSON array
    dependencies TEXT,  -- JSON object
    file_structure_map TEXT,  -- JSON object
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

-- CodeChange table (for auto-capture)
CREATE TABLE IF NOT EXISTS code_changes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL,  -- 'add', 'modify', 'delete'
    diff_content TEXT NOT NULL,
    commit_sha TEXT,
    commit_message TEXT,
    timestamp REAL NOT NULL,
    is_committed BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES project_contexts(id)
);

-- DecisionRecord table (extracted from commits/manual)
CREATE TABLE IF NOT EXISTS decision_records (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    rationale TEXT,
    alternatives TEXT,  -- JSON array
    consequences TEXT,
    context TEXT,
    timestamp REAL NOT NULL,
    source TEXT,  -- 'commit', 'manual', 'scan'
    commit_sha TEXT,
    FOREIGN KEY (project_id) REFERENCES project_contexts(id)
);

-- Checkpoint table (for safety/rollback)
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    git_stash_ref TEXT,
    timestamp REAL NOT NULL,
    reason TEXT NOT NULL,
    files_affected TEXT,  -- JSON array
    memory_snapshot_id TEXT,
    is_applied BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES project_contexts(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_entries_project ON memory_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_type ON memory_entries(content_type);
CREATE INDEX IF NOT EXISTS idx_memory_entries_timestamp ON memory_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_memory_entries_file ON memory_entries(file_path);
CREATE INDEX IF NOT EXISTS idx_code_changes_project ON code_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_code_changes_file ON code_changes(file_path);
CREATE INDEX IF NOT EXISTS idx_code_changes_commit ON code_changes(commit_sha);
CREATE INDEX IF NOT EXISTS idx_decision_records_project ON decision_records(project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_project ON checkpoints(project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp);
