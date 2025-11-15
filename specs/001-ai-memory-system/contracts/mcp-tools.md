# MCP Tools Contract: JARVIS Memory System

**Protocol**: Model Context Protocol (MCP)  
**Server**: jarvis-mcp  
**Version**: 1.0.0  
**Date**: 2025-11-15

## Overview

This contract defines the MCP tools exposed by the JARVIS memory system. These tools enable AI agents (GitHub Copilot, Cursor, etc.) to interact with JARVIS memory for persistent, context-aware assistance.

**Base Requirements**:

- All tools return responses in JARVIS persona (English, concise, address as "Sir")
- All tools include execution time in response metadata
- All tools validate inputs and return structured errors
- All tools operate on current project context (set via `switch_project` or inferred from workspace)

---

## Tool Definitions

### 1. remember_context

**Purpose**: Store information to JARVIS memory (manual capture).

**Input Schema**:

```json
{
  "content": {
    "type": "string",
    "description": "The information to remember",
    "required": true,
    "minLength": 1,
    "maxLength": 10000
  },
  "type": {
    "type": "string",
    "enum": ["decision", "bug", "architecture", "note"],
    "description": "Category of information being stored",
    "required": true
  },
  "metadata": {
    "type": "object",
    "description": "Additional context (tags, related files, etc.)",
    "required": false,
    "properties": {
      "tags": { "type": "array", "items": { "type": "string" } },
      "file_paths": { "type": "array", "items": { "type": "string" } },
      "related_ids": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

**Output Schema**:

```json
{
  "success": { "type": "boolean" },
  "message": { "type": "string" },
  "data": {
    "type": "object",
    "properties": {
      "memory_id": { "type": "string", "format": "uuid" },
      "timestamp": { "type": "string", "format": "date-time" },
      "project_id": { "type": "string" }
    }
  },
  "execution_time_ms": { "type": "number" }
}
```

**Example Request**:

```json
{
  "content": "We chose PostgreSQL over MySQL for better JSON support and ACID compliance",
  "type": "decision",
  "metadata": {
    "tags": ["database", "architecture"],
    "file_paths": ["src/db/connection.py", "config/database.yml"]
  }
}
```

**Example Response**:

```json
{
  "success": true,
  "message": "Remembered, Sir. Decision stored regarding database choice.",
  "data": {
    "memory_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-15T14:30:00Z",
    "project_id": "a3f5c8d..."
  },
  "execution_time_ms": 45
}
```

**Error Cases**:

- Content empty: `400 Bad Request - Content cannot be empty, Sir`
- Invalid type: `400 Bad Request - Type must be one of: decision, bug, architecture, note`
- Project not initialized: `404 Not Found - Project not initialized. Run 'jarvis init' first, Sir`

---

### 2. recall_context

**Purpose**: Search JARVIS memory semantically or by filters.

**Input Schema**:

```json
{
  "query": {
    "type": "string",
    "description": "Natural language search query",
    "required": true,
    "minLength": 1
  },
  "filters": {
    "type": "object",
    "required": false,
    "properties": {
      "type": { "type": "array", "items": { "type": "string" } },
      "since": { "type": "string", "format": "date-time" },
      "until": { "type": "string", "format": "date-time" },
      "files": { "type": "array", "items": { "type": "string" } },
      "tags": { "type": "array", "items": { "type": "string" } }
    }
  },
  "limit": {
    "type": "number",
    "description": "Maximum results to return",
    "required": false,
    "default": 10,
    "minimum": 1,
    "maximum": 100
  }
}
```

**Output Schema**:

```json
{
  "success": { "type": "boolean" },
  "message": { "type": "string" },
  "data": {
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "memory_id": { "type": "string" },
            "content": { "type": "string" },
            "type": { "type": "string" },
            "relevance_score": { "type": "number", "minimum": 0, "maximum": 1 },
            "timestamp": { "type": "string", "format": "date-time" },
            "related_files": { "type": "array", "items": { "type": "string" } },
            "tags": { "type": "array", "items": { "type": "string" } }
          }
        }
      },
      "total_found": { "type": "number" },
      "query_time_ms": { "type": "number" }
    }
  },
  "execution_time_ms": { "type": "number" }
}
```

**Example Request**:

```json
{
  "query": "database bug we fixed last week",
  "filters": {
    "type": ["bug"],
    "since": "2025-11-08T00:00:00Z",
    "tags": ["database"]
  },
  "limit": 5
}
```

**Example Response**:

```json
{
  "success": true,
  "message": "Found 3 relevant memories, Sir.",
  "data": {
    "results": [
      {
        "memory_id": "660e8400-e29b-41d4-a716-446655440001",
        "content": "Fixed connection pool leak in PostgreSQL driver...",
        "type": "bug",
        "relevance_score": 0.94,
        "timestamp": "2025-11-10T16:20:00Z",
        "related_files": ["src/db/pool.py"],
        "tags": ["database", "performance"]
      }
    ],
    "total_found": 3,
    "query_time_ms": 1250
  },
  "execution_time_ms": 1280
}
```

**Error Cases**:

- Query empty: `400 Bad Request - Query cannot be empty, Sir`
- Invalid date format: `400 Bad Request - Date filter must be ISO 8601 format`
- Limit exceeded: `400 Bad Request - Limit cannot exceed 100 results`
- No results: `200 OK` with empty results array and message "No matching memories found, Sir"

---

### 3. analyze_codebase

**Purpose**: Run project scan/onboarding to understand existing codebase.

**Input Schema**:

```json
{
  "project_path": {
    "type": "string",
    "description": "Absolute path to project root",
    "required": false
  },
  "options": {
    "type": "object",
    "required": false,
    "properties": {
      "detect_inconsistencies": { "type": "boolean", "default": true },
      "max_files": { "type": "number", "default": 10000 },
      "timeout_seconds": { "type": "number", "default": 300 }
    }
  }
}
```

**Output Schema**:

```json
{
  "success": { "type": "boolean" },
  "message": { "type": "string" },
  "data": {
    "type": "object",
    "properties": {
      "summary": {
        "type": "object",
        "properties": {
          "tech_stack": { "type": "array", "items": { "type": "string" } },
          "file_count": { "type": "number" },
          "total_loc": { "type": "number" },
          "primary_languages": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      },
      "inconsistencies": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": { "type": "string" },
            "description": { "type": "string" },
            "files": { "type": "array", "items": { "type": "string" } },
            "severity": { "type": "string", "enum": ["low", "medium", "high"] }
          }
        }
      },
      "questions": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "question": { "type": "string" },
            "context": { "type": "string" }
          }
        }
      }
    }
  },
  "execution_time_ms": { "type": "number" }
}
```

**Example Request**:

```json
{
  "project_path": "/home/user/projects/myapp",
  "options": {
    "detect_inconsistencies": true,
    "max_files": 5000
  }
}
```

**Example Response**:

```json
{
  "success": true,
  "message": "Project analyzed, Sir. Found 3 inconsistencies requiring clarification.",
  "data": {
    "summary": {
      "tech_stack": ["Python 3.11", "FastAPI", "PostgreSQL", "Redis"],
      "file_count": 247,
      "total_loc": 15420,
      "primary_languages": ["Python", "JavaScript", "SQL"]
    },
    "inconsistencies": [
      {
        "type": "mixed_imports",
        "description": "Both relative and absolute imports used inconsistently",
        "files": ["src/api/routes.py", "src/models/user.py"],
        "severity": "medium"
      }
    ],
    "questions": [
      {
        "question": "Should all imports be absolute or relative?",
        "context": "Found mixed import styles across modules"
      }
    ]
  },
  "execution_time_ms": 42500
}
```

**Error Cases**:

- Path not found: `404 Not Found - Project path does not exist, Sir`
- Not a directory: `400 Bad Request - Path must be a directory, not a file`
- Timeout exceeded: `408 Request Timeout - Analysis exceeded timeout limit`
- Permission denied: `403 Forbidden - Cannot read project directory. Check permissions, Sir`

---

### 4. validate_changes

**Purpose**: Pre-change validation to check safety before modifications.

**Input Schema**:

```json
{
  "files": {
    "type": "array",
    "description": "List of files to be modified",
    "required": true,
    "minItems": 1,
    "items": { "type": "string" }
  },
  "validation_type": {
    "type": "string",
    "enum": ["syntax", "lint", "test", "build", "all"],
    "required": false,
    "default": "all"
  }
}
```

**Output Schema**:

```json
{
  "success": { "type": "boolean" },
  "message": { "type": "string" },
  "data": {
    "type": "object",
    "properties": {
      "valid": { "type": "boolean" },
      "checkpoint_recommended": { "type": "boolean" },
      "issues": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "file": { "type": "string" },
            "type": { "type": "string" },
            "message": { "type": "string" },
            "severity": {
              "type": "string",
              "enum": ["error", "warning", "info"]
            }
          }
        }
      },
      "validation_results": {
        "type": "object",
        "properties": {
          "syntax": { "type": "boolean" },
          "lint": { "type": "boolean" },
          "tests": { "type": "boolean" },
          "build": { "type": "boolean" }
        }
      }
    }
  },
  "execution_time_ms": { "type": "number" }
}
```

**Example Request**:

```json
{
  "files": ["src/api/auth.py", "src/models/user.py", "tests/test_auth.py"],
  "validation_type": "all"
}
```

**Example Response**:

```json
{
  "success": true,
  "message": "Validation complete, Sir. Checkpoint recommended for 3 files.",
  "data": {
    "valid": true,
    "checkpoint_recommended": true,
    "issues": [],
    "validation_results": {
      "syntax": true,
      "lint": true,
      "tests": true,
      "build": true
    }
  },
  "execution_time_ms": 3200
}
```

**Error Cases**:

- Files list empty: `400 Bad Request - At least one file required for validation`
- Invalid validation type: `400 Bad Request - Invalid validation_type. Must be: syntax, lint, test, build, or all`
- File not found: `404 Not Found - File 'src/missing.py' does not exist`

---

### 5. get_architecture

**Purpose**: Retrieve current project file structure and architecture overview.

**Input Schema**:

```json
{
  "project_path": {
    "type": "string",
    "description": "Absolute path to project root",
    "required": false
  },
  "depth": {
    "type": "number",
    "description": "Maximum directory depth to return",
    "required": false,
    "default": 3,
    "minimum": 1,
    "maximum": 10
  }
}
```

**Output Schema**:

```json
{
  "success": { "type": "boolean" },
  "message": { "type": "string" },
  "data": {
    "type": "object",
    "properties": {
      "structure": {
        "type": "object",
        "description": "Nested directory/file tree"
      },
      "summary": {
        "type": "object",
        "properties": {
          "total_directories": { "type": "number" },
          "total_files": { "type": "number" },
          "key_directories": { "type": "array", "items": { "type": "string" } },
          "architecture_pattern": { "type": "string" }
        }
      }
    }
  },
  "execution_time_ms": { "type": "number" }
}
```

**Example Response**:

```json
{
  "success": true,
  "message": "Architecture retrieved, Sir.",
  "data": {
    "structure": {
      "src": {
        "api": ["routes.py", "middleware.py"],
        "models": ["user.py", "project.py"],
        "services": ["auth.py", "email.py"]
      },
      "tests": {
        "unit": ["test_models.py"],
        "integration": ["test_api.py"]
      }
    },
    "summary": {
      "total_directories": 8,
      "total_files": 42,
      "key_directories": ["src/api", "src/models", "tests"],
      "architecture_pattern": "Layered (MVC-style)"
    }
  },
  "execution_time_ms": 150
}
```

---

### 6. create_checkpoint

**Purpose**: Manually create safety checkpoint before risky operations.

**Input Schema**:

```json
{
  "reason": {
    "type": "string",
    "description": "Why checkpoint is being created",
    "required": true,
    "minLength": 1,
    "maxLength": 200
  },
  "files": {
    "type": "array",
    "description": "Files that will be affected (optional)",
    "required": false,
    "items": { "type": "string" }
  }
}
```

**Output Schema**:

```json
{
  "success": { "type": "boolean" },
  "message": { "type": "string" },
  "data": {
    "type": "object",
    "properties": {
      "checkpoint_id": { "type": "string", "format": "uuid" },
      "git_stash_ref": { "type": "string" },
      "timestamp": { "type": "string", "format": "date-time" },
      "files_count": { "type": "number" }
    }
  },
  "execution_time_ms": { "type": "number" }
}
```

**Example Response**:

```json
{
  "success": true,
  "message": "Checkpoint created, Sir. Safe to proceed.",
  "data": {
    "checkpoint_id": "770e8400-e29b-41d4-a716-446655440002",
    "git_stash_ref": "stash@{0}",
    "timestamp": "2025-11-15T14:45:00Z",
    "files_count": 15
  },
  "execution_time_ms": 520
}
```

**Error Cases**:

- Not a git repository: `400 Bad Request - Project is not a git repository`
- Reason too long: `400 Bad Request - Reason must be under 200 characters`
- Git stash failed: `500 Internal Server Error - Failed to create git stash. Working directory may be clean.`

---

### 7. rollback

**Purpose**: Undo changes by restoring from checkpoint.

**Input Schema**:

```json
{
  "checkpoint_id": {
    "type": "string",
    "description": "UUID of checkpoint to restore",
    "required": false
  },
  "steps": {
    "type": "number",
    "description": "Number of operations to rollback (if no checkpoint_id)",
    "required": false,
    "default": 1,
    "minimum": 1,
    "maximum": 10
  },
  "confirm": {
    "type": "boolean",
    "description": "Confirmation flag for safety",
    "required": true
  }
}
```

**Output Schema**:

```json
{
  "success": { "type": "boolean" },
  "message": { "type": "string" },
  "data": {
    "type": "object",
    "properties": {
      "checkpoint_id": { "type": "string" },
      "files_restored": { "type": "number" },
      "timestamp": { "type": "string", "format": "date-time" },
      "changes_reverted": {
        "type": "array",
        "items": { "type": "string" }
      }
    }
  },
  "execution_time_ms": { "type": "number" }
}
```

**Example Request**:

```json
{
  "steps": 1,
  "confirm": true
}
```

**Example Response**:

```json
{
  "success": true,
  "message": "Rollback complete, Sir. Restored to previous state.",
  "data": {
    "checkpoint_id": "770e8400-e29b-41d4-a716-446655440002",
    "files_restored": 15,
    "timestamp": "2025-11-15T14:45:00Z",
    "changes_reverted": ["src/api/auth.py", "src/models/user.py"]
  },
  "execution_time_ms": 680
}
```

**Error Cases**:

- No checkpoint found: `404 Not Found - No checkpoint available for rollback, Sir`
- Confirmation missing: `400 Bad Request - Rollback requires confirmation flag`
- Checkpoint not found: `404 Not Found - Checkpoint with ID '...' not found`
- Git stash apply failed: `500 Internal Server Error - Failed to apply stash. Conflicts may exist.`

---

## Additional MCP Tools

### 8. switch_project _(Context Management)_

**Purpose**: Switch JARVIS context to different project.

**Input**: `{"project_path": "/absolute/path/to/project"}`  
**Output**: `{"success": true, "message": "Switched to project: myapp", "project_id": "..."}`

---

## Error Response Format

All errors follow consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message, Sir",
    "details": "Optional additional context"
  },
  "execution_time_ms": 12
}
```

**Common Error Codes**:

- `INVALID_INPUT` - Validation failed on input parameters
- `PROJECT_NOT_FOUND` - Project not initialized or path invalid
- `MEMORY_ERROR` - Database operation failed
- `GIT_ERROR` - Git operation failed
- `TIMEOUT` - Operation exceeded time limit
- `INTERNAL_ERROR` - Unexpected server error

---

## Performance Guarantees

- `remember_context`: <100ms (excluding embedding generation)
- `recall_context`: <2000ms (per spec requirement)
- `analyze_codebase`: <300s for 10k files (5min limit)
- `validate_changes`: <5s for typical validation
- `get_architecture`: <500ms for depth=3
- `create_checkpoint`: <1s for typical project
- `rollback`: <2s for typical rollback

---

**Contract Version**: 1.0.0  
**Last Updated**: 2025-11-15  
**Status**: Ready for Implementation
