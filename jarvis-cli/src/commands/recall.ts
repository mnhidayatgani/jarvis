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
  id?: string // For drill-down by specific memory ID
}

export async function handleRecallCommand(
  query: string,
  options: RecallOptions = {},
): Promise<void> {
  const output = getFormatter(options)

  try {
    // Handle drill-down by ID
    if (options.id) {
      await handleRecallById(options.id, options)
      return
    }

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
    if (!result.data?.results || result.data.results.length === 0) {
      output.info('No memories found matching your query', false)
      
      // Suggest alternatives
      if (query.length > 0) {
        output.info('Try broader search terms or check available memories with "jarvis status"', false)
      }
      return
    }

    output.success(`Found ${result.data.results.length} ${result.data.results.length === 1 ? 'memory' : 'memories'}`)

    // Display in table format
    console.log()
    displayResultsTable(result.data.results, options)
    console.log()

    // Show tip for drill-down
    if (!options.quiet && result.data.results.length > 0) {
      output.info('Use --verbose for details or --id <memory_id> to view full content', false)
    }
  } catch (error) {
    output.error(
      'Failed to recall memory',
      error instanceof Error ? error : undefined,
    )
    process.exit(1)
  }
}

/**
 * Display search results in table format
 */
function displayResultsTable(results: any[], options: RecallOptions): void {
  // Table headers
  const headers = ['ID', 'Content', 'Relevance', 'Date']
  if (options.verbose) {
    headers.push('Type', 'File')
  }

  // Calculate column widths
  const maxContentLength = options.verbose ? 60 : 80
  
  // Display table header
  console.log('─'.repeat(120))
  console.log(`  ${headers.join('  |  ')}`)
  console.log('─'.repeat(120))

  // Display each result
  results.forEach((item, index) => {
    const id = item.id || (index + 1).toString()
    const content = truncateText(item.content || '', maxContentLength)
    const relevance = item.relevance_score 
      ? `${(item.relevance_score * 100).toFixed(0)}%`
      : 'N/A'
    const date = item.timestamp 
      ? new Date(item.timestamp).toLocaleDateString()
      : 'Unknown'

    let row = `  ${id.padEnd(6)} | ${content.padEnd(maxContentLength)} | ${relevance.padEnd(9)} | ${date}`

    if (options.verbose) {
      const type = item.type || 'N/A'
      const file = item.file_path ? truncateText(item.file_path, 20) : 'N/A'
      row += ` | ${type.padEnd(8)} | ${file}`
    }

    console.log(row)
  })

  console.log('─'.repeat(120))
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Handle drill-down to view specific memory by ID
 */
async function handleRecallById(id: string, options: RecallOptions): Promise<void> {
  const output = getFormatter(options)

  try {
    output.progress(`Retrieving memory ${id}...`)

    const client = getDefaultClient()
    const result = await client.callTool('get_memory_by_id', {
      memory_id: id,
      project_path: process.cwd(),
    })

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
      return
    }

    if (!result.success || !result.data) {
      output.error(`Memory ${id} not found`)
      process.exit(1)
    }

    const memory = result.data

    // Display full memory details
    console.log()
    console.log('═'.repeat(80))
    console.log(`  Memory ID: ${id}`)
    console.log('═'.repeat(80))
    console.log()
    console.log(`📝 ${memory.content}`)
    console.log()
    
    if (memory.type) {
      console.log(`   Type: ${memory.type}`)
    }
    if (memory.timestamp) {
      console.log(`   Date: ${new Date(memory.timestamp).toLocaleString()}`)
    }
    if (memory.file_path) {
      console.log(`   File: ${memory.file_path}`)
    }
    if (memory.tags && memory.tags.length > 0) {
      console.log(`   Tags: ${memory.tags.join(', ')}`)
    }
    if (memory.metadata) {
      console.log(`   Metadata: ${JSON.stringify(memory.metadata, null, 2)}`)
    }
    
    console.log()
    console.log('═'.repeat(80))
  } catch (error) {
    output.error(
      `Failed to retrieve memory ${id}`,
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
    } else if (arg === '--id') {
      options.id = args[++i]
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
