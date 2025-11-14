/**
 * Recall Command - Search JARVIS memory
 */

import { getDefaultClient } from '../api/mcp-client'
import { getFormatter } from '../utils/output'

interface RecallOptions {
  type?: string
  file?: string
  since?: string
  limit?: number
  verbose?: boolean
  quiet?: boolean
  json?: boolean
}

export async function handleRecallCommand(
  query: string,
  options: RecallOptions = {},
): Promise<void> {
  const output = getFormatter(options)

  try {
    if (!query || query.length === 0) {
      output.error('Query cannot be empty. Use: jarvis recall "search query"')
      process.exit(1)
    }

    output.progress('Searching JARVIS memory...')

    // Call MCP server to search memory
    const client = getDefaultClient()
    const result = await client.recallContext({
      query,
      type_filter: options.type,
      file_filter: options.file,
      since: options.since,
      limit: options.limit || 10,
    })

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    // Format results
    if (!result.results || result.results.length === 0) {
      output.info('No memories found matching your query', false)
      return
    }

    output.success(`Found ${result.results.length} ${result.results.length === 1 ? 'memory' : 'memories'}`)

    // Display results
    for (const item of result.results) {
      console.log()
      console.log(`📝 ${item.content}`)

      if (options.verbose) {
        const details: string[] = []
        if (item.type) details.push(`Type: ${item.type}`)
        if (item.file_path) details.push(`File: ${item.file_path}`)
        if (item.timestamp) {
          details.push(`Time: ${new Date(item.timestamp).toLocaleString()}`)
        }
        if (item.relevance_score !== undefined) {
          details.push(`Relevance: ${(item.relevance_score * 100).toFixed(1)}%`)
        }

        if (details.length > 0) {
          output.info(`   ${details.join(' | ')}`, false)
        }
      } else {
        // Concise format
        if (item.timestamp) {
          const timeStr = new Date(item.timestamp).toLocaleDateString()
          console.log(`   ${timeStr}`)
        }
      }
    }

    console.log()
  } catch (error) {
    output.error(
      'Failed to recall memory',
      error instanceof Error ? error : undefined,
    )
    process.exit(1)
  }
}

/**
 * Parse command line arguments for recall command
 */
export function parseRecallArgs(args: string[]): {
  query: string
  options: RecallOptions
} {
  const options: RecallOptions = {}
  const queryParts: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--type' || arg === '-t') {
      options.type = args[++i]
    } else if (arg === '--file' || arg === '-f') {
      options.file = args[++i]
    } else if (arg === '--since' || arg === '-s') {
      options.since = args[++i]
    } else if (arg === '--limit' || arg === '-l') {
      options.limit = parseInt(args[++i], 10)
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true
    } else if (arg === '--json') {
      options.json = true
    } else if (!arg.startsWith('-')) {
      queryParts.push(arg)
    }
  }

  return { query: queryParts.join(' '), options }
}
