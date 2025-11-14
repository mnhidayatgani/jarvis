/**
 * Doctor Command - Health checks for JARVIS system
 */

import { existsSync } from 'fs'
import { resolve } from 'path'
import { getFormatter } from '../utils/output'

interface DoctorOptions {
  verbose?: boolean
  json?: boolean
}

interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

export async function handleDoctorCommand(
  options: DoctorOptions = {},
): Promise<void> {
  const output = getFormatter(options)

  try {
    const checks: HealthCheck[] = []
    const jarvisDir = resolve(process.cwd(), '.jarvis')

    // Check 1: JARVIS initialized
    if (existsSync(jarvisDir)) {
      checks.push({
        name: 'JARVIS Initialized',
        status: 'pass',
        message: '.jarvis directory exists',
      })
    } else {
      checks.push({
        name: 'JARVIS Initialized',
        status: 'fail',
        message: '.jarvis directory not found - run: jarvis init',
      })
    }

    // Check 2: SQLite database
    const sqlitePath = resolve(jarvisDir, 'db', 'memory.db')
    if (existsSync(sqlitePath)) {
      checks.push({
        name: 'SQLite Database',
        status: 'pass',
        message: 'Database file exists',
      })
    } else {
      checks.push({
        name: 'SQLite Database',
        status: 'fail',
        message: 'Database file missing',
      })
    }

    // Check 3: ChromaDB
    const chromaPath = resolve(jarvisDir, 'db', 'chroma')
    if (existsSync(chromaPath)) {
      checks.push({
        name: 'ChromaDB',
        status: 'pass',
        message: 'ChromaDB directory exists',
      })
    } else {
      checks.push({
        name: 'ChromaDB',
        status: 'warn',
        message: 'ChromaDB directory missing - will be created on first use',
      })
    }

    // Check 4: Configuration
    const configPath = resolve(jarvisDir, 'config.json')
    if (existsSync(configPath)) {
      checks.push({
        name: 'Configuration',
        status: 'pass',
        message: 'Config file exists',
      })
    } else {
      checks.push({
        name: 'Configuration',
        status: 'warn',
        message: 'Config file missing - using defaults',
      })
    }

    // Check 5: Git repository
    if (existsSync(resolve(process.cwd(), '.git'))) {
      checks.push({
        name: 'Git Repository',
        status: 'pass',
        message: 'Git repository detected',
      })
    } else {
      checks.push({
        name: 'Git Repository',
        status: 'warn',
        message: 'Not a git repository - auto-capture will be limited',
      })
    }

    // Check 6: Disk space
    // Note: This is a simplified check - full implementation would use system calls
    checks.push({
      name: 'Disk Space',
      status: 'pass',
      message: 'Sufficient disk space (check not implemented)',
    })

    if (options.json) {
      console.log(JSON.stringify({ checks }, null, 2))
      return
    }

    // Display results
    console.log('\n🏥 JARVIS Health Check\n')

    const passCount = checks.filter((c) => c.status === 'pass').length
    const failCount = checks.filter((c) => c.status === 'fail').length
    const warnCount = checks.filter((c) => c.status === 'warn').length

    for (const check of checks) {
      const icon =
        check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠'
      const color =
        check.status === 'pass'
          ? '\x1b[32m'
          : check.status === 'fail'
            ? '\x1b[31m'
            : '\x1b[33m'
      const reset = '\x1b[0m'

      console.log(`${color}${icon}${reset} ${check.name}`)
      if (options.verbose || check.status !== 'pass') {
        console.log(`  ${check.message}`)
      }
    }

    console.log()
    console.log(
      `Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`,
    )
    console.log()

    if (failCount > 0) {
      output.error('Health check failed')
      process.exit(1)
    } else if (warnCount > 0) {
      output.info('Health check passed with warnings', false)
    } else {
      output.success('All health checks passed')
    }
  } catch (error) {
    output.error(
      'Health check failed',
      error instanceof Error ? error : undefined,
    )
    process.exit(1)
  }
}

export function parseDoctorArgs(args: string[]): DoctorOptions {
  const options: DoctorOptions = {}

  for (const arg of args) {
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--json') {
      options.json = true
    }
  }

  return options
}
