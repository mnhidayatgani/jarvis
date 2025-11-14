/**
 * Remember Command - Store information to JARVIS memory
 */

import { readFileSync } from 'fs'
import { getDefaultClient } from '../api/mcp-client'
import { getFormatter } from '../utils/output'

interface RememberOptions {
  type?: string
  tags?: string[]
  file?: string
  verbose?: boolean
  quiet?: boolean
  json?: boolean
}

export async function handleRememberCommand(
  args: string[],
  options: RememberOptions = {},
): Promise<void> {
  const output = getFormatter(options)

  try {
    // Get content from args or stdin
    let content: string

    if (args.length > 0) {
      // Content from command line arguments
      content = args.join(' ')
    } else {
      // Content from stdin
      try {
        content = readFileSync(0, 'utf-8').trim()
      } catch {
        output.error('No content provided. Use: jarvis remember "content" or pipe via stdin')
        process.exit(1)
      }
    }

    if (!content || content.length === 0) {
      output.error('Content cannot be empty')
      process.exit(1)
    }

    output.progress('Storing to JARVIS memory...')

    // Call MCP server to store memory
    const client = getDefaultClient()
    const result = await client.rememberContext({
      content,
      type: options.type || 'decision',
      tags: options.tags || [],
      file_path: options.file,
    })

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      output.success('Memory stored')
      if (options.verbose && result.memory_id) {
        output.info(`ID: ${result.memory_id.substring(0, 16)}...`, false)
        output.info(`Type: ${result.type || 'decision'}`, false)
        if (result.timestamp) {
          output.info(`Time: ${new Date(result.timestamp).toLocaleString()}`, false)
        }
      }
    }
  } catch (error) {
    output.error(
      'Failed to store memory',
      error instanceof Error ? error : undefined,
    )
    process.exit(1)
  }
}

/**
 * Parse command line arguments for remember command
 */
export function parseRememberArgs(args: string[]): {
  contentArgs: string[]
  options: RememberOptions
} {
  const options: RememberOptions = {}
  const contentArgs: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--type' || arg === '-t') {
      options.type = args[++i]
    } else if (arg === '--tags') {
      const tagsStr = args[++i]
      options.tags = tagsStr.split(',').map((t) => t.trim())
    } else if (arg === '--file' || arg === '-f') {
      options.file = args[++i]
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true
    } else if (arg === '--json') {
      options.json = true
    } else if (!arg.startsWith('-')) {
      contentArgs.push(arg)
    }
  }

  return { contentArgs, options }
}
