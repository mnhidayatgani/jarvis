/**
 * Init Command - Initialize JARVIS memory system in a project
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, basename } from 'path'
import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { getDefaultClient } from '../api/mcp-client'
import { getFormatter } from '../utils/output'
import { DEFAULT_CONFIG } from '../config/config'

interface InitOptions {
  force?: boolean
  verbose?: boolean
  quiet?: boolean
}

export async function handleInitCommand(options: InitOptions = {}): Promise<void> {
  const output = getFormatter(options)

  try {
    // Detect project root
    const projectRoot = detectProjectRoot()
    output.progress('Initializing JARVIS memory system...')

    // Check if .jarvis already exists
    const jarvisDir = resolve(projectRoot, '.jarvis')
    if (existsSync(jarvisDir)) {
      if (!options.force) {
        output.warning('.jarvis directory already exists')
        output.info(
          'Use --force to reinitialize (this will preserve existing data)',
          false,
        )
        process.exit(1)
      }
      output.info('Reinitializing existing .jarvis directory', false)
    }

    // Check if git repository exists
    const isGitRepo = checkGitRepository(projectRoot)
    if (!isGitRepo) {
      output.warning(
        'Not a git repository - auto-capture features will be limited',
      )
      output.info(
        'Run "git init" to enable full auto-capture capabilities',
        false,
      )
    }

    // Create .jarvis directory structure
    createDirectoryStructure(jarvisDir)
    output.progress('Created directory structure')

    // Create config.json
    createConfigFile(jarvisDir)
    output.progress('Created configuration file')

    // Get project metadata
    const projectName = basename(projectRoot)
    const projectId = generateProjectId(projectRoot)

    // Initialize databases (will be done via MCP server in full implementation)
    // For now, we create the basic structure
    initializeDatabases(jarvisDir, projectId)
    output.progress('Initialized databases')

    // Create ProjectContext
    createProjectContext(jarvisDir, projectId, projectName, projectRoot)
    output.progress('Created project context')

    // Success message
    output.success('JARVIS memory system initialized')

    if (options.verbose) {
      output.info('Project details:', false)
      output.list([
        `Name: ${projectName}`,
        `Root: ${projectRoot}`,
        `ID: ${projectId.substring(0, 16)}...`,
        `Git: ${isGitRepo ? 'Yes' : 'No'}`,
      ])
    }

    output.info('Run "jarvis status" to view memory system status', false)
  } catch (error) {
    output.error(
      'Failed to initialize JARVIS',
      error instanceof Error ? error : undefined,
    )
    process.exit(1)
  }
}

/**
 * Detect project root directory
 */
function detectProjectRoot(): string {
  // Start from current directory
  let currentDir = process.cwd()

  // Look for common project indicators
  const indicators = [
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'pom.xml',
    'build.gradle',
    '.git',
  ]

  // Check current directory
  for (const indicator of indicators) {
    if (existsSync(resolve(currentDir, indicator))) {
      return currentDir
    }
  }

  // If no indicators found, use current directory
  return currentDir
}

/**
 * Check if current directory is a git repository
 */
function checkGitRepository(projectRoot: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: projectRoot,
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Create .jarvis directory structure
 */
function createDirectoryStructure(jarvisDir: string): void {
  // Create main directory
  if (!existsSync(jarvisDir)) {
    mkdirSync(jarvisDir, { recursive: true })
  }

  // Create subdirectories
  const subdirs = ['db', 'snapshots']
  for (const subdir of subdirs) {
    const path = resolve(jarvisDir, subdir)
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true })
    }
  }
}

/**
 * Create config.json file
 */
function createConfigFile(jarvisDir: string): void {
  const configPath = resolve(jarvisDir, 'config.json')

  // Only create if doesn't exist (preserve existing config)
  if (!existsSync(configPath)) {
    const config = {
      ...DEFAULT_CONFIG,
      initialized_at: new Date().toISOString(),
    }

    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  }
}

/**
 * Generate project ID from path
 */
function generateProjectId(projectRoot: string): string {
  const absolutePath = resolve(projectRoot)
  return createHash('sha256').update(absolutePath).digest('hex')
}

/**
 * Initialize databases
 */
function initializeDatabases(jarvisDir: string, projectId: string): void {
  // Create placeholder for SQLite database
  const dbPath = resolve(jarvisDir, 'db', 'memory.db')

  // Create placeholder for ChromaDB
  const chromaPath = resolve(jarvisDir, 'db', 'chroma')
  if (!existsSync(chromaPath)) {
    mkdirSync(chromaPath, { recursive: true })
  }

  // Note: Actual database initialization will be done via MCP server
  // For now, we just create the directory structure
}

/**
 * Create initial ProjectContext
 */
function createProjectContext(
  jarvisDir: string,
  projectId: string,
  projectName: string,
  projectRoot: string,
): void {
  const contextPath = resolve(jarvisDir, 'project_context.json')

  const context = {
    id: projectId,
    name: projectName,
    root_path: projectRoot,
    tech_stack: [],
    dependencies: {},
    file_structure_map: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf-8')
}

/**
 * Parse command line arguments for init command
 */
export function parseInitArgs(args: string[]): InitOptions {
  const options: InitOptions = {}

  for (const arg of args) {
    if (arg === '--force' || arg === '-f') {
      options.force = true
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true
    }
  }

  return options
}
