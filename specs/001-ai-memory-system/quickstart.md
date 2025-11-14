# Quickstart Guide: JARVIS - AI Coding Agent Memory System

**Target Audience**: Developers implementing JARVIS  
**Prerequisites**: Python 3.10+, Node.js 18+, Git, basic understanding of embeddings and vector databases  
**Time to Complete**: 30-45 minutes  
**Date**: 2025-11-15

---

## Overview

This quickstart helps you set up the development environment and run JARVIS for the first time. You'll create both the Python MCP server and TypeScript CLI tool, initialize a test project, and verify all components work together.

---

## Phase 1: Environment Setup (5-10 min)

### 1.1 Install System Dependencies

**Linux (Ubuntu/Debian)**:

```bash
sudo apt update
sudo apt install -y python3.10 python3-pip nodejs npm git
```

**macOS**:

```bash
brew install python@3.10 node git
```

**Windows**:

- Install Python 3.10+ from python.org
- Install Node.js 18+ from nodejs.org
- Install Git from git-scm.com

### 1.2 Install Python Package Manager (uv)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# Or via pip: pip install uv
```

Verify installation:

```bash
uv --version  # Should show v0.1.0 or higher
```

### 1.3 Install Node Package Manager (pnpm)

```bash
npm install -g pnpm@8
```

Verify installation:

```bash
pnpm --version  # Should show 8.x.x
```

---

## Phase 2: Clone & Setup Projects (10-15 min)

### 2.1 Create Project Structure

```bash
# Create workspace
mkdir ~/jarvis-workspace
cd ~/jarvis-workspace

# Create both projects
mkdir jarvis-mcp jarvis-cli
```

### 2.2 Setup Python MCP Server

```bash
cd jarvis-mcp

# Create directory structure
mkdir -p src/jarvis/{memory,mcp,capture,speckit,utils}
mkdir -p tests/{unit,integration,e2e}

# Create pyproject.toml
cat > pyproject.toml << 'EOF'
[project]
name = "jarvis-mcp"
version = "0.1.0"
description = "JARVIS AI Coding Agent Memory System - MCP Server"
requires-python = ">=3.10"
dependencies = [
    "chromadb==0.4.24",
    "sentence-transformers>=2.2.0",
    "watchdog>=3.0.0",
]

[project.optional-dependencies]
dev = [
    "ruff>=0.1.0",
    "black>=23.0.0",
    "mypy>=1.7.0",
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "isort>=5.12.0",
]

[tool.black]
line-length = 100

[tool.isort]
profile = "black"
line_length = 100

[tool.ruff]
line-length = 100
select = ["E", "F", "W", "I"]

[tool.mypy]
python_version = "3.10"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
minversion = "6.0"
addopts = "-ra -q --cov=src/jarvis --cov-report=term-missing"
testpaths = ["tests"]
asyncio_mode = "auto"
EOF

# Create __init__.py files
touch src/jarvis/__init__.py
touch src/jarvis/memory/__init__.py
touch src/jarvis/mcp/__init__.py
touch src/jarvis/capture/__init__.py
touch src/jarvis/speckit/__init__.py
touch src/jarvis/utils/__init__.py

# Install dependencies
uv pip install -e ".[dev]"
```

### 2.3 Setup TypeScript CLI Tool

```bash
cd ../jarvis-cli

# Create directory structure
mkdir -p src/{commands,api,config,utils}
mkdir -p tests/{unit,integration}

# Create package.json
cat > package.json << 'EOF'
{
  "name": "jarvis-cli",
  "version": "0.1.0",
  "description": "JARVIS AI Coding Agent Memory System - CLI Tool",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "jarvis": "dist/index.js"
  },
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node18 --format=esm --outfile=dist/index.js --banner:js='#!/usr/bin/env node'",
    "dev": "npm run build -- --watch",
    "start": "node dist/index.js",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "packageManager": "pnpm@8.0.0",
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "esbuild": "^0.19.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.2.0",
    "vitest": "^0.34.0"
  }
}
EOF

# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
EOF

# Create Prettier config
cat > .prettierrc.json << 'EOF'
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all"
}
EOF

# Create minimal CLI entry point
cat > src/index.ts << 'EOF'
#!/usr/bin/env node

function main() {
  console.log('JARVIS CLI Initialized, Sir.')
}

main()
EOF

# Install dependencies
pnpm install

# Build CLI
pnpm run build
```

---

## Phase 3: First Run & Verification (5-10 min)

### 3.1 Verify Python Setup

```bash
cd ~/jarvis-workspace/jarvis-mcp

# Run linters (should pass with no files yet)
black --check src/
ruff check src/
mypy src/

# Run tests (no tests yet, should pass)
pytest
```

**Expected Output**:

```
All done! ✨ 🍰 ✨
No issues found
Success: no issues found in X source files
collected 0 items
```

### 3.2 Verify TypeScript Setup

```bash
cd ~/jarvis-workspace/jarvis-cli

# Type check
pnpm run typecheck

# Lint
pnpm run lint

# Build and run
pnpm run build
node dist/index.js
```

**Expected Output**:

```
JARVIS CLI Initialized, Sir.
```

### 3.3 Create Symbolic Link for CLI (Optional)

```bash
chmod +x ~/jarvis-workspace/jarvis-cli/dist/index.js
sudo ln -s ~/jarvis-workspace/jarvis-cli/dist/index.js /usr/local/bin/jarvis

# Test global command
jarvis
```

---

## Phase 4: Initialize Test Project (5-10 min)

### 4.1 Create Test Project

```bash
# Create a simple test project
mkdir ~/test-jarvis-project
cd ~/test-jarvis-project

# Initialize git
git init
git config user.name "Test User"
git config user.email "test@example.com"

# Create basic structure
mkdir -p src tests
echo "print('Hello World')" > src/main.py
echo "# Test Project" > README.md

# Initial commit
git add .
git commit -m "Initial commit"
```

### 4.2 Initialize JARVIS Memory (Manual for Now)

Since the full CLI isn't implemented yet, create the structure manually:

```bash
cd ~/test-jarvis-project

# Create JARVIS directory
mkdir -p .jarvis/{db,snapshots}

# Create placeholder config
cat > .jarvis/config.json << 'EOF'
{
  "version": "0.1.0",
  "project_name": "test-jarvis-project",
  "initialized_at": "2025-11-15T00:00:00Z",
  "settings": {
    "auto_capture": true,
    "semantic_search": true
  }
}
EOF

echo "JARVIS initialized in test project!"
```

---

## Phase 5: Development Workflow (Ongoing)

### 5.1 Pre-commit Checks

Before committing code, run:

**Python**:

```bash
cd ~/jarvis-workspace/jarvis-mcp
black src/
isort src/
ruff check --fix src/
mypy src/
pytest tests/unit/  # Fast unit tests only
```

**TypeScript**:

```bash
cd ~/jarvis-workspace/jarvis-cli
pnpm run format
pnpm run lint --fix
pnpm run typecheck
pnpm run test
```

### 5.2 Run Integration Tests

```bash
# Python integration tests (slower, include database)
cd ~/jarvis-workspace/jarvis-mcp
pytest tests/integration/

# TypeScript integration tests (CLI + MCP)
cd ~/jarvis-workspace/jarvis-cli
pnpm run test:integration  # When implemented
```

### 5.3 Manual Testing Checklist

- [ ] Create a memory entry (manual Python script)
- [ ] Query memory (manual Python script)
- [ ] Verify SQLite database created
- [ ] Verify ChromaDB collection created
- [ ] Test embeddings generation
- [ ] Test file watcher (modify file, check detection)
- [ ] Test git hooks (commit, check capture)

---

## Phase 6: Next Steps

### 6.1 Implement Core Components (Priority Order)

1. **Configuration Management** (`src/jarvis/utils/config.py`)

   - Load global config from `~/.jarvis/config.json`
   - Load project config from `.jarvis/config.json`
   - Merge with priority (project overrides global)

2. **SQLite Factual Memory** (`src/jarvis/memory/factual.py`)

   - Initialize database schema
   - CRUD operations for MemoryEntry, ProjectContext
   - Indexing for fast queries

3. **ChromaDB Semantic Memory** (`src/jarvis/memory/semantic.py`)

   - Initialize ChromaDB client and collection
   - Add documents with embeddings
   - Semantic search with filters

4. **Embeddings** (`src/jarvis/utils/embeddings.py`)

   - Load bge-large-en-v1.5 model
   - Generate embeddings for text
   - Batch processing for efficiency

5. **File Watcher** (`src/jarvis/capture/file_watcher.py`)

   - Use Watchdog library
   - Detect file modifications
   - Filter by .gitignore rules

6. **Git Hooks** (`src/jarvis/capture/git_hooks.py`)
   - Install pre-commit and post-commit hooks
   - Capture commit metadata and diffs
   - Link to decision records

### 6.2 Implement CLI Commands

Order by user story priority (P1 first):

1. `jarvis init` - US-1.1 (P1)
2. `jarvis remember` - US-2.2 (P1)
3. `jarvis recall` - US-2.2 (P1)
4. `jarvis scan` - US-2.3 (P2)
5. `jarvis status` - US-3.4 (P2)
6. `jarvis rollback` - US-5.4 (P3)
7. `jarvis config` - Configuration management
8. `jarvis doctor` - Health checks

### 6.3 Implement MCP Server

1. Create MCP server using official Python package
2. Implement 7 MCP tools from contract (see `contracts/mcp-tools.md`)
3. Add JARVIS persona to all responses
4. Connect to memory system
5. Test with Copilot/Cursor

---

## Troubleshooting

### Issue: uv command not found

**Solution**: Restart shell or run `source ~/.bashrc` (Linux/macOS)

### Issue: pnpm command not found

**Solution**: Run `npm install -g pnpm` again, ensure npm is in PATH

### Issue: ChromaDB import fails

**Solution**: Run `uv pip install chromadb sentence-transformers` explicitly

### Issue: esbuild fails on Windows

**Solution**: Install `node-gyp` globally: `npm install -g node-gyp`

### Issue: Permission denied for /usr/local/bin

**Solution**: Use `~/bin` instead or run with `sudo`

---

## Resources

- **Constitution**: `/.specify/memory/constitution.md` - All governance rules
- **Specification**: `/specs/001-ai-memory-system/spec.md` - Detailed requirements
- **Data Model**: `/specs/001-ai-memory-system/data-model.md` - Entity definitions
- **MCP Contract**: `/specs/001-ai-memory-system/contracts/mcp-tools.md` - API definitions
- **Research**: `/specs/001-ai-memory-system/research.md` - Technical decisions

---

## Success Criteria

You're ready to start implementing when:

- ✅ Both projects build without errors
- ✅ All linters and type checkers pass
- ✅ Test framework runs (even with 0 tests)
- ✅ CLI executable shows "JARVIS CLI Initialized, Sir"
- ✅ Test project has `.jarvis/` directory structure
- ✅ You understand the 3-layer memory architecture
- ✅ You've read the constitution and understand the 7 principles

---

**Development Time Estimate**: 4-6 weeks for Phase 1 MVP (US-1.1, US-2.2)  
**Team Size**: 1-2 developers  
**Next Command**: `/speckit.tasks` to generate detailed implementation tasks

---

**Quickstart Version**: 1.0.0  
**Last Updated**: 2025-11-15  
**Status**: Ready for Development
