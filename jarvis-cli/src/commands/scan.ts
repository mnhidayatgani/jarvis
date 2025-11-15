/**
 * Scan Command - Analyze existing codebase
 */

import { resolve } from 'path'
import { getDefaultClient } from '../api/mcp-client'
import { getFormatter } from '../utils/output'

interface ScanOptions {
  verbose?: boolean
  quiet?: boolean
  json?: boolean
  interactive?: boolean
}

export async function handleScanCommand(
  options: ScanOptions = {},
): Promise<void> {
  const output = getFormatter(options)

  try {
    const projectPath = process.cwd()
    output.progress('Analyzing codebase...')

    // Call MCP server to analyze codebase
    const client = getDefaultClient()
    const result = await client.analyzeCodebase(projectPath, {
      verbose: options.verbose,
      interactive: options.interactive,
    })

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    if (!result.success) {
      output.error('Analysis failed', new Error(result.error || 'Unknown error'))
      process.exit(1)
    }

    const analysis = result.data

    // If we have a formatted report from scanner, display it
    if (result.report && !options.json) {
      console.log(result.report)
      console.log()
    } else {
      // Fallback to structured display
      // Display summary
      output.success('Codebase analysis complete')
      console.log()
    }

    // In verbose mode or if no report, show detailed breakdown
    if (options.verbose || !result.report) {
      // Tech stack
      if (analysis?.tech_stack && analysis.tech_stack.length > 0) {
        console.log('📚 Tech Stack:')
        output.list(analysis.tech_stack)
        console.log()
      }

      // Dependencies
      if (analysis?.dependencies) {
        const depCount = Object.keys(analysis.dependencies).length
        if (depCount > 0) {
          console.log(`📦 Dependencies: ${depCount} detected`)
          if (options.verbose) {
            for (const [manager, deps] of Object.entries(analysis.dependencies)) {
              console.log(`   ${manager}:`)
              const depList = Array.isArray(deps) ? deps : Object.keys(deps as object)
              depList.slice(0, 10).forEach((dep: string) => {
                console.log(`     - ${dep}`)
              })
              if (depList.length > 10) {
                console.log(`     ... and ${depList.length - 10} more`)
              }
            }
          }
          console.log()
        }
      }

      // File structure
      if (analysis?.file_count !== undefined) {
        console.log(`📁 Files: ${analysis.file_count} analyzed`)
        if (analysis.directory_count) {
          console.log(`📂 Directories: ${analysis.directory_count}`)
        }
        console.log()
      }

      // Inconsistencies
      if (analysis?.inconsistencies && analysis.inconsistencies.length > 0) {
        console.log('⚠️  Inconsistencies Detected:')
        analysis.inconsistencies.forEach((issue: any) => {
          console.log(`   • ${issue.type}: ${issue.description}`)
          if (options.verbose && issue.examples) {
            issue.examples.forEach((ex: string) => console.log(`     - ${ex}`))
          }
        })
        console.log()
      }

      // Questions
      if (analysis?.questions && analysis.questions.length > 0) {
        console.log('❓ Clarifying Questions:')
        analysis.questions.forEach((q: string, i: number) => {
          console.log(`   ${i + 1}. ${q}`)
        })
        console.log()

        // Interactive mode
        if (options.interactive) {
          output.info('Run with --interactive to answer questions', false)
        }
      }

      // Suggestions
      if (options.verbose && analysis?.suggestions) {
        console.log('💡 Suggestions:')
        output.list(analysis.suggestions)
        console.log()
      }
    }

    output.info('Project context stored in JARVIS memory', false)
  } catch (error) {
    output.error(
      'Failed to scan codebase',
      error instanceof Error ? error : undefined,
    )
    process.exit(1)
  }
}

/**
 * Parse command line arguments for scan command
 */
export function parseScanArgs(args: string[]): ScanOptions {
  const options: ScanOptions = {}

  for (const arg of args) {
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true
    } else if (arg === '--json') {
      options.json = true
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true
    }
  }

  return options
}
