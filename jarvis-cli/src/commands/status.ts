/**
 * Status Command - Show JARVIS system status
 */

import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { getDefaultClient } from '../api/mcp-client'
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
      memory: null as any,
    }

    // Get memory stats from MCP server
    try {
      const client = getDefaultClient()
      const memoryStats = await client.callTool('get_memory_status', {
        project_path: process.cwd(),
      })

      if (memoryStats.success && memoryStats.data) {
        stats.memory = memoryStats.data
      }
    } catch (error) {
      // MCP server might not be running, continue with basic stats
      if (options.verbose) {
        console.warn('Could not fetch memory stats from MCP server')
      }
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
    console.log(
      `  SQLite: ${stats.databases.sqlite ? '✓' : '✗'} ${stats.databases.sqliteSize || ''}`,
    )
    console.log(`  ChromaDB: ${stats.databases.chroma ? '✓' : '✗'}`)
    console.log()

    // Memory stats (from MCP server)
    if (stats.memory) {
      console.log('📝 Memory:')
      console.log(`  Total entries: ${stats.memory.total_entries || 0}`)
      if (options.verbose) {
        console.log(`  Decisions: ${stats.memory.decisions || 0}`)
        console.log(`  Notes: ${stats.memory.notes || 0}`)
        if (stats.memory.last_activity) {
          const lastDate = new Date(stats.memory.last_activity).toLocaleString()
          console.log(`  Last activity: ${lastDate}`)
        }
        console.log(`  Disk usage: ${stats.memory.disk_usage_mb || 0} MB`)

        if (stats.memory.collections) {
          const collections = Object.entries(stats.memory.collections)
          if (collections.length > 0) {
            console.log(`  Collections:`)
            collections.forEach(([name, count]) => {
              console.log(`    - ${name}: ${count}`)
            })
          }
        }
      }
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
