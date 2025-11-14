/**
 * Status Command - Show JARVIS system status
 */

import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { getFormatter } from '../utils/output'

interface StatusOptions {
  verbose?: boolean
  json?: boolean
}

export async function handleStatusCommand(
  options: StatusOptions = {},
): Promise<void> {
  const output = getFormatter(options)

  try {
    const jarvisDir = resolve(process.cwd(), '.jarvis')

    // Check if JARVIS initialized
    if (!existsSync(jarvisDir)) {
      output.error('JARVIS not initialized in this directory')
      console.log('Run: jarvis init')
      process.exit(1)
    }

    const stats = {
      initialized: true,
      directory: jarvisDir,
      databases: checkDatabases(jarvisDir),
      config: checkConfig(jarvisDir),
      project: checkProject(jarvisDir),
    }

    if (options.json) {
      console.log(JSON.stringify(stats, null, 2))
      return
    }

    // Display status
    console.log('\n📊 JARVIS Status\n')

    // Project info
    if (stats.project.name) {
      console.log(`Project: ${stats.project.name}`)
    }
    console.log(`Location: ${process.cwd()}`)
    console.log()

    // Databases
    console.log('💾 Databases:')
    console.log(`  SQLite: ${stats.databases.sqlite ? '✓' : '✗'} ${stats.databases.sqliteSize || ''}`)
    console.log(`  ChromaDB: ${stats.databases.chroma ? '✓' : '✗'}`)
    console.log()

    // Memory stats
    if (options.verbose && stats.databases.sqlite) {
      console.log('📝 Memory:')
      console.log('  Factual entries: (query needed)')
      console.log('  Semantic entries: (query needed)')
      console.log()
    }

    // Config
    console.log('⚙️  Configuration:')
    console.log(`  Config file: ${stats.config.exists ? '✓' : '✗'}`)
    if (stats.config.settings && options.verbose) {
      console.log(`  Persona: ${stats.config.settings.persona || 'default'}`)
      console.log(`  Language: ${stats.config.settings.language || 'en'}`)
    }
    console.log()

    output.success('System operational')
  } catch (error) {
    output.error(
      'Failed to get status',
      error instanceof Error ? error : undefined,
    )
    process.exit(1)
  }
}

function checkDatabases(jarvisDir: string) {
  const sqlitePath = resolve(jarvisDir, 'db', 'memory.db')
  const chromaPath = resolve(jarvisDir, 'db', 'chroma')

  const result = {
    sqlite: existsSync(sqlitePath),
    sqliteSize: '',
    chroma: existsSync(chromaPath),
  }

  if (result.sqlite) {
    const size = statSync(sqlitePath).size
    result.sqliteSize = formatBytes(size)
  }

  return result
}

function checkConfig(jarvisDir: string) {
  const configPath = resolve(jarvisDir, 'config.json')
  const exists = existsSync(configPath)

  let settings = null
  if (exists) {
    try {
      settings = require(configPath)
    } catch {
      // Ignore parse errors
    }
  }

  return { exists, settings }
}

function checkProject(jarvisDir: string) {
  const contextPath = resolve(jarvisDir, 'project_context.json')

  if (existsSync(contextPath)) {
    try {
      const context = require(contextPath)
      return {
        name: context.name || context.project_name || null,
        techStack: context.tech_stack || [],
      }
    } catch {
      return { name: null, techStack: [] }
    }
  }

  return { name: null, techStack: [] }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function parseStatusArgs(args: string[]): StatusOptions {
  const options: StatusOptions = {}

  for (const arg of args) {
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--json') {
      options.json = true
    }
  }

  return options
}
