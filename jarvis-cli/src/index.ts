#!/usr/bin/env node

import handleConfigCommand from './commands/config'
import { handleInitCommand, parseInitArgs } from './commands/init'
import { handleRememberCommand, parseRememberArgs } from './commands/remember'
import { handleRecallCommand, parseRecallArgs } from './commands/recall'

/**
 * JARVIS CLI Entry Point
 * Parses command-line arguments and routes to appropriate command handler
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command) {
    console.log('JARVIS CLI Initialized, Sir.')
    return
  }

  switch (command) {
    case 'init':
      await handleInitCommand(parseInitArgs(args.slice(1)))
      break

    case 'remember':
      {
        const { contentArgs, options } = parseRememberArgs(args.slice(1))
        await handleRememberCommand(contentArgs, options)
      }
      break

    case 'recall':
      {
        const { query, options } = parseRecallArgs(args.slice(1))
        await handleRecallCommand(query, options)
      }
      break

    case 'config':
      handleConfigCommand(args.slice(1))
      break

    default:
      console.error(`Error: Unknown command "${command}"`)
      console.log('Available commands: init, remember, recall, config')
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
