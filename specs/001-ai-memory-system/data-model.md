# Data Model: JARVIS - AI Coding Agent Memory System

**Phase**: 1 (Design & Contracts)  
**Date**: 2025-11-15  
**Purpose**: Define entities, fields, relationships, validation rules, and state transitions

## Entity Overview

JARVIS memory system consists of 6 core entities that together enable persistent, context-aware assistance:

1. **MemoryEntry** - Base abstraction for all stored information
2. **ProjectContext** - Project-level metadata and configuration
3. **DecisionRecord** - Captured decisions with rationale
4. **CodeChange** - Tracked code modifications
5. **Checkpoint** - Safety snapshots for rollback
6. **Configuration** - User and project settings

## Entity Definitions

### 1. MemoryEntry

**Purpose**: Abstract base entity for all types of stored information in JARVIS memory system.

**Fields**:

- `id`: UUID (primary key) - Unique identifier for memory entry
- `type`: Enum - One of: `FACTUAL`, `SEMANTIC`, `SNAPSHOT`
- `content`: Text - The actual information being stored
- `embedding`: Vector[1024] | NULL - bge-large-en-v1.5 embedding (only for SEMANTIC type)
- `timestamp`: DateTime - When entry was created (ISO 8601 format)
- `project_id`: String - Foreign key to ProjectContext (path hash)
- `metadata`: JSON - Flexible additional data (tags, file_paths, related_ids, custom fields)

**Relationships**:

- Belongs to one `ProjectContext`
- Can reference other `MemoryEntry` via `metadata.related_ids`
- Can be linked from `DecisionRecord` or `CodeChange`

**Validation Rules**:

- `type` must be one of the three enum values
- `embedding` required if type=SEMANTIC, must be NULL otherwise
- `content` cannot be empty string
- `project_id` must reference existing project
- `timestamp` must be valid ISO 8601 datetime

**State Transitions**:

- Created → Indexed (after embedding generated for SEMANTIC)
- Indexed → Queryable (after added to ChromaDB collection)
- Queryable → Archived (if retention policy applied)
- Any state → Deleted (explicit user action)

**Storage**:

- FACTUAL: SQLite only (key-value table)
- SEMANTIC: SQLite (metadata) + ChromaDB (vector + content)
- SNAPSHOT: Filesystem (files) + SQLite (reference)

---

### 2. ProjectContext

**Purpose**: Stores project-level metadata, configuration, and architectural information.

**Fields**:

- `id`: String (primary key) - SHA256 hash of absolute project path
- `name`: String - Human-readable project name
- `root_path`: String - Absolute path to project root directory
- `tech_stack`: JSON Array - List of technologies (e.g., `["Python 3.11", "FastAPI", "PostgreSQL"]`)
- `dependencies`: JSON Object - Package dependencies by ecosystem (e.g., `{"python": {...}, "npm": {...}}`)
- `file_structure_map`: JSON Tree - Current directory/file structure
- `coding_conventions`: JSON Object - Detected or specified coding standards
- `configuration`: JSON Object - Project-specific JARVIS config overrides
- `created_at`: DateTime - Project first initialized in JARVIS
- `last_updated`: DateTime - Last time project context was modified

**Relationships**:

- Has many `MemoryEntry` (one-to-many)
- Has many `DecisionRecord` (one-to-many)
- Has many `CodeChange` (one-to-many)
- Has many `Checkpoint` (one-to-many)

**Validation Rules**:

- `id` must be valid SHA256 hash (64 hex characters)
- `root_path` must be absolute and exist on filesystem
- `tech_stack` must be non-empty array after scan/init
- `file_structure_map` must be valid JSON tree structure
- `last_updated` must be >= `created_at`

**State Transitions**:

- Uninitialized (directory exists, no `.jarvis/`)
- Initializing (`jarvis init` in progress)
- Active (`.jarvis/` exists, databases initialized)
- Scanning (`jarvis scan` analyzing codebase)
- Scanned (scan complete, context populated)
- Active → Archived (user explicitly archives project)

**Storage**:

- SQLite: `projects` table with JSON columns for complex fields

---

### 3. DecisionRecord

**Purpose**: Captures architectural and technical decisions with full context and rationale.

**Fields**:

- `id`: UUID (primary key) - Unique identifier for decision
- `description`: Text - What was decided (e.g., "Use PostgreSQL instead of MySQL")
- `reasoning`: Text - Why this decision was made
- `alternatives_considered`: JSON Array - Other options evaluated with pros/cons
- `timestamp`: DateTime - When decision was made
- `related_files`: JSON Array - File paths affected by this decision
- `related_memories`: JSON Array - IDs of related MemoryEntry records
- `project_id`: String - Foreign key to ProjectContext
- `tags`: JSON Array - Categorization tags (e.g., `["database", "architecture"]`)

**Relationships**:

- Belongs to one `ProjectContext`
- Linked to multiple `MemoryEntry` via `related_memories`
- Can be referenced by `CodeChange` (decision → implementation)

**Validation Rules**:

- `description` required, max 500 characters
- `reasoning` required, max 2000 characters
- `alternatives_considered` must be array of objects with keys: `option`, `pros`, `cons`
- `related_files` must be valid relative paths from project root
- `tags` must be lowercase, alphanumeric + hyphens only

**State Transitions**:

- Draft (decision being considered, not final)
- Recorded (decision made, stored in memory)
- Implemented (code changes applied based on decision)
- Superseded (newer decision overrides this one)
- Archived (no longer relevant, kept for historical record)

**Storage**:

- SQLite: Core fields in `decisions` table
- ChromaDB: Description + reasoning as semantic entry for search

---

### 4. CodeChange

**Purpose**: Tracks code modifications with diffs, context, and links to decisions.

**Fields**:

- `id`: UUID (primary key) - Unique identifier for code change
- `file_path`: String - Relative path from project root
- `change_type`: Enum - One of: `ADD`, `MODIFY`, `DELETE`, `RENAME`
- `diff_content`: Text - Git diff or full content for new files
- `commit_sha`: String | NULL - Git commit hash if committed, NULL if uncommitted
- `commit_message`: String | NULL - Git commit message if available
- `timestamp`: DateTime - When change was detected
- `decision_id`: UUID | NULL - Foreign key to DecisionRecord if change implements decision
- `project_id`: String - Foreign key to ProjectContext
- `metadata`: JSON - Additional context (author, branch, lines_added, lines_removed)

**Relationships**:

- Belongs to one `ProjectContext`
- Optionally links to one `DecisionRecord`
- Creates one `MemoryEntry` (type=SNAPSHOT) for the diff

**Validation Rules**:

- `file_path` must be valid relative path
- `change_type` must be one of the enum values
- `diff_content` required for MODIFY, should be empty for DELETE
- `commit_sha` must be valid git SHA-1 hash (40 hex) or NULL
- `timestamp` must be monotonically increasing within project

**State Transitions**:

- Detected (file watcher sees change, uncommitted)
- Staged (git add executed, pending commit)
- Committed (git commit executed, has commit_sha)
- Captured (stored in JARVIS memory)
- Reverted (rollback applied, change undone)

**Storage**:

- SQLite: Metadata in `code_changes` table
- Filesystem: Diff content in `.jarvis/snapshots/{timestamp}_{file_path}.diff`
- MemoryEntry: Reference to snapshot location

---

### 5. Checkpoint

**Purpose**: Safety snapshots for rollback functionality, wrapping git stash with metadata.

**Fields**:

- `id`: UUID (primary key) - Unique identifier for checkpoint
- `git_stash_ref`: String - Git stash reference (e.g., `stash@{0}`)
- `timestamp`: DateTime - When checkpoint was created
- `reason`: String - Why checkpoint was created (e.g., "Before modifying 15 files")
- `files_affected`: JSON Array - List of file paths that will be modified
- `memory_snapshot_id`: UUID - Foreign key to MemoryEntry with full memory state
- `project_id`: String - Foreign key to ProjectContext
- `metadata`: JSON - Additional context (command, user trigger vs auto)

**Relationships**:

- Belongs to one `ProjectContext`
- Links to one `MemoryEntry` (memory state snapshot)
- Can be restored to undo changes

**Validation Rules**:

- `git_stash_ref` must match pattern `stash@{N}` where N is integer
- `reason` required, max 200 characters
- `files_affected` must be non-empty array of valid paths
- `memory_snapshot_id` must reference existing MemoryEntry of type SNAPSHOT

**State Transitions**:

- Created (checkpoint saved, stash exists)
- Expired (auto-cleanup after 30 days)
- Applied (rollback executed, stash popped)
- Dropped (manual deletion before expiry)

**Storage**:

- SQLite: Checkpoint metadata in `checkpoints` table
- Git: Actual file state in git stash
- MemoryEntry: Memory state snapshot for reference

---

### 6. Configuration

**Purpose**: Stores user preferences and project-specific settings with hierarchical override.

**Fields**:

- `id`: UUID (primary key) - Unique identifier for config entry
- `scope`: Enum - One of: `GLOBAL`, `PROJECT`
- `key`: String - Configuration key (dot notation, e.g., `persona.language`)
- `value`: JSON - Configuration value (supports strings, numbers, booleans, objects, arrays)
- `project_id`: String | NULL - Foreign key to ProjectContext (NULL for GLOBAL scope)
- `description`: String - Human-readable description of what this config controls
- `default_value`: JSON - System default if not set
- `last_modified`: DateTime - When this config was last changed

**Relationships**:

- If scope=PROJECT, belongs to one `ProjectContext`
- If scope=GLOBAL, no project association

**Validation Rules**:

- If scope=GLOBAL, `project_id` must be NULL
- If scope=PROJECT, `project_id` must reference existing project
- `key` must follow dot notation pattern (e.g., `category.subcategory.setting`)
- `value` type must match schema for that key
- `default_value` must match `value` type

**State Transitions**:

- Undefined (key not set, uses default_value)
- Defined (key explicitly set by user)
- Overridden (PROJECT scope overrides GLOBAL for same key)
- Reset (user deletes custom value, reverts to default)

**Predefined Configuration Keys**:

```json
{
  "persona.language": "en",
  "persona.address": "Sir",
  "persona.response_style": "concise",
  "memory.retention_days": null,
  "memory.auto_capture": true,
  "mcp.server_port": 3000,
  "mcp.auto_start": false,
  "performance.query_timeout_ms": 2000,
  "performance.max_results": 100,
  "safety.checkpoint_threshold_files": 5,
  "safety.auto_rollback": true
}
```

**Storage**:

- GLOBAL: `~/.jarvis/config.json` (pretty-printed JSON file)
- PROJECT: `.jarvis/config.json` (pretty-printed JSON file)
- SQLite: `configurations` table for queryability

---

## Entity Relationships Diagram

```
ProjectContext (1) ──< (N) MemoryEntry
      │
      ├──< (N) DecisionRecord
      │          │
      │          └──> (N) MemoryEntry [related_memories]
      │
      ├──< (N) CodeChange
      │          │
      │          └──> (1) DecisionRecord [optional, via decision_id]
      │
      ├──< (N) Checkpoint
      │          │
      │          └──> (1) MemoryEntry [memory_snapshot_id]
      │
      └──< (N) Configuration [PROJECT scope only]

Configuration [GLOBAL scope] (standalone, no ProjectContext)
```

**Legend**:

- `(1) ──< (N)`: One-to-many relationship
- `└──>`: Foreign key reference
- `[field]`: Field name creating relationship

---

## Data Flow Examples

### Example 1: Capturing a Code Change

1. File watcher detects modification to `src/auth.py`
2. Create `CodeChange` entity:
   - `file_path`: `src/auth.py`
   - `change_type`: `MODIFY`
   - `diff_content`: Git diff
   - `commit_sha`: NULL (uncommitted)
3. Create `MemoryEntry` entity:
   - `type`: `SNAPSHOT`
   - `content`: Reference to diff file location
   - `metadata`: `{"related_change_id": "<CodeChange.id>"}`
4. On git commit:
   - Update `CodeChange.commit_sha`
   - Update `CodeChange.commit_message`
   - Extract decision from commit message if present
   - Create `DecisionRecord` if detected
   - Link `CodeChange.decision_id` if decision created

### Example 2: Creating a Checkpoint Before Risky Change

1. JARVIS detects modification will affect 15 files
2. Create git stash: `git stash push -u -m "JARVIS checkpoint: Before modifying 15 files"`
3. Get stash ref: `stash@{0}`
4. Create `MemoryEntry` snapshot of current memory state
5. Create `Checkpoint` entity:
   - `git_stash_ref`: `stash@{0}`
   - `reason`: "Before modifying 15 files"
   - `files_affected`: List of 15 file paths
   - `memory_snapshot_id`: ID from step 4
6. Proceed with modifications
7. If validation fails:
   - Lookup `Checkpoint` by latest timestamp
   - Execute `git stash pop stash@{0}`
   - Restore memory state from snapshot
   - Mark checkpoint as Applied

### Example 3: Semantic Search Query

1. User queries: `jarvis recall "database choice"`
2. Generate embedding for query using bge-large-en-v1.5
3. Query ChromaDB collection for project:
   - Filter by `project_id`
   - Find top 10 nearest neighbors to query embedding
   - Apply metadata filters (e.g., type=DECISION, timestamp range)
4. Retrieve full `MemoryEntry` records from SQLite using IDs
5. If decision found, fetch linked `DecisionRecord` for details
6. Return results with relevance scores, formatted in JARVIS persona
7. Include related files and decisions in response

---

## Validation Summary

**Entity Integrity**:

- All foreign keys must reference existing records
- Enum fields must use defined values only
- Timestamps must be valid ISO 8601 format
- JSON fields must parse successfully

**Business Rules**:

- Cannot delete ProjectContext while MemoryEntry records exist
- Checkpoint must reference valid git stash (verify before rollback)
- Configuration PROJECT scope requires valid project_id
- DecisionRecord alternatives_considered must have at least 1 alternative

**Performance Constraints**:

- MemoryEntry.embedding indexed in ChromaDB (HNSW algorithm)
- ProjectContext.id indexed (primary key, hash lookups)
- CodeChange.file_path indexed (frequent queries by path)
- MemoryEntry.timestamp indexed (time-range queries)

**Data Quality**:

- Embeddings regenerated if bge-large-en-v1.5 model updated
- File structure map rebuilt on significant directory changes
- Orphaned checkpoints cleaned up after 30 days
- Dead foreign key references prevented by cascading deletes

---

**Phase 1 Data Model Complete** - Ready for contract generation.
