#!/usr/bin/env node

import handleConfigCommand from './commands/config'
import { handleInitCommand, parseInitArgs } from './commands/init'

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

    case 'config':
      handleConfigCommand(args.slice(1))
      break

    default:
      console.error(`Error: Unknown command "${command}"`)
      console.log('Available commands: init, config')
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
