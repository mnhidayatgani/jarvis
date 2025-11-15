/**
 * Doctor Command - Health checks for JARVIS system
 */

import { existsSync } from 'fs'
import { resolve } from 'path'
import { getDefaultClient } from '../api/mcp-client'
import { getFormatter } from '../utils/output'

interface DoctorOptions {
  verbose?: boolean
  json?: boolean
  quiet?: boolean
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
    if (!options.quiet) {
      output.progress('Running system diagnostics...')
    }

    const jarvisDir = resolve(process.cwd(), '.jarvis')

    // Quick check if JARVIS is initialized
    if (!existsSync(jarvisDir)) {
      output.error('JARVIS not initialized in this directory')
      console.log('Run: jarvis init')
      process.exit(1)
    }

    // Try to get comprehensive health checks from MCP server
    let healthData: any = null
    try {
      const client = getDefaultClient()
      const result = await client.callTool('run_health_checks', {
        project_path: process.cwd(),
      })

      if (result.success && result.data) {
        healthData = result.data
      }
    } catch (error) {
      // Fallback to basic checks if MCP unavailable
      if (options.verbose) {
        console.warn('MCP server unavailable, using basic checks')
      }
    }

    if (options.json) {
      console.log(JSON.stringify(healthData || {}, null, 2))
      return
    }

    // Display results
    console.log('\n🏥 JARVIS System Diagnostics\n')

    if (healthData) {
      // Display MCP health check results
      const statusIcon = healthData.overall === 'healthy' ? '✅' : '⚠️'
      const statusText =
        healthData.overall === 'healthy'
          ? 'All systems operational'
          : 'Issues detected'

      console.log(`${statusIcon} Status: ${statusText}`)
      console.log(
        `   ${healthData.passed} passed, ${healthData.failed} failed, ${healthData.warnings} warnings`,
      )
      console.log()

      // Display each check
      const checks = healthData.checks || {}
      displayCheck('Python Version', checks.python_version, options.verbose)
      displayCheck('Dependencies', checks.dependencies, options.verbose)
      displayCheck('Databases', checks.databases, options.verbose)
      displayCheck('Disk Space', checks.disk_space, options.verbose)
      displayCheck('Permissions', checks.permissions, options.verbose)
      displayCheck('Git Repository', checks.git, options.verbose)

      console.log()

      // Exit with appropriate code
      if (healthData.overall === 'healthy') {
        output.success('System healthy')
        process.exit(0)
      } else if (healthData.failed > 0) {
        output.error('System has critical issues')
        process.exit(1)
      } else {
        console.log('⚠️  System has warnings but is operational')
        process.exit(0)
      }
    } else {
      // Fallback to basic checks
      const checks = runBasicChecks(jarvisDir)
      displayBasicChecks(checks, options.verbose || false)

      const failCount = checks.filter((c) => c.status === 'fail').length
      if (failCount > 0) {
        output.error('Health check failed')
        process.exit(1)
      } else {
        output.success('Basic health checks passed')
      }
    }
  } catch (error) {
    output.error(
      'Failed to run diagnostics',
      error instanceof Error ? error : undefined,
    )
    process.exit(1)
  }
}

function displayCheck(
  name: string,
  check: any,
  verbose: boolean = false,
): void {
  if (!check) {
    return
  }

  const icon = getStatusIcon(check.status)
  console.log(`${icon} ${name}`)

  if (check.message) {
    console.log(`   ${check.message}`)
  }

  if (verbose && check.details) {
    displayDetails(check.details, '   ')
  }

  console.log()
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pass':
      return '✅'
    case 'warning':
      return '⚠️'
    case 'fail':
      return '❌'
    default:
      return '❓'
  }
}

function displayDetails(details: any, indent: string = ''): void {
  if (typeof details === 'string') {
    console.log(`${indent}Details: ${details}`)
    return
  }

  if (Array.isArray(details)) {
    details.forEach((item) => {
      console.log(`${indent}- ${item}`)
    })
    return
  }

  if (typeof details === 'object') {
    Object.entries(details).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`${indent}${key}:`)
        ;(value as any[]).forEach((item) => {
          console.log(`${indent}  - ${item}`)
        })
      } else if (typeof value === 'object' && value !== null) {
        console.log(`${indent}${key}:`)
        displayDetails(value, indent + '  ')
      } else {
        console.log(`${indent}${key}: ${value}`)
      }
    })
  }
}

interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
}

function runBasicChecks(jarvisDir: string): HealthCheck[] {
  const checks: HealthCheck[] = []

  // Check SQLite database
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

  // Check ChromaDB
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
      message: 'ChromaDB directory missing',
    })
  }

  // Check Configuration
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
      message: 'Config file missing',
    })
  }

  return checks
}

function displayBasicChecks(checks: HealthCheck[], verbose: boolean): void {
  console.log('Running basic health checks...\n')

  for (const check of checks) {
    const icon =
      check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠'
    console.log(`${icon} ${check.name}`)
    if (verbose || check.status !== 'pass') {
      console.log(`  ${check.message}`)
    }
  }

  const passCount = checks.filter((c) => c.status === 'pass').length
  const failCount = checks.filter((c) => c.status === 'fail').length
  const warnCount = checks.filter((c) => c.status === 'warn').length

  console.log()
  console.log(
    `Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`,
  )
  console.log()
}

export function parseDoctorArgs(args: string[]): DoctorOptions {
  const options: DoctorOptions = {}

  for (const arg of args) {
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true
    }
  }

  return options
}
