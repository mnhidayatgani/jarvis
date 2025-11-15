#!/usr/bin/env node

import handleConfigCommand from './commands/config'
import { handleInitCommand, parseInitArgs } from './commands/init'
import { handleRememberCommand, parseRememberArgs } from './commands/remember'
import { handleRecallCommand, parseRecallArgs } from './commands/recall'
import { handleScanCommand, parseScanArgs } from './commands/scan'
import { handleStatusCommand, parseStatusArgs } from './commands/status'
import { handleDoctorCommand, parseDoctorArgs } from './commands/doctor'
import { handleInternalOnCommit } from './commands/internal'
import { handleCheckpoint } from './commands/checkpoint'
import { handleRollback } from './commands/rollback'
import { handleValidate } from './commands/validate'
import { handleCleanup } from './commands/cleanup'

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

    case 'scan':
      await handleScanCommand(parseScanArgs(args.slice(1)))
      break

    case 'status':
      await handleStatusCommand(parseStatusArgs(args.slice(1)))
      break

    case 'doctor':
      await handleDoctorCommand(parseDoctorArgs(args.slice(1)))
      break

    case 'config':
      handleConfigCommand(args.slice(1))
      break

    case '_internal_on_commit':
      // Internal command called by git hooks (not for user use)
      await handleInternalOnCommit()
      break

    case 'checkpoint':
      {
        const reason = args.slice(1).find((arg) => !arg.startsWith('-'))
        const options = {
          list: args.includes('--list') || args.includes('-l'),
          preview: args.find((arg) => arg.startsWith('--preview='))?.split('=')[1],
          validate: args.includes('--validate') || args.includes('-v'),
          json: args.includes('--json'),
        }
        await handleCheckpoint(reason || null, options)
      }
      break

    case 'rollback':
      {
        const checkpointId = args.slice(1).find((arg) => !arg.startsWith('-'))
        const options = {
          keep: args.includes('--keep') || args.includes('-k'),
          json: args.includes('--json'),
        }
        await handleRollback(checkpointId || null, options)
      }
      break

    case 'validate':
      {
        const options = {
          json: args.includes('--json'),
          verbose: args.includes('--verbose') || args.includes('-v'),
        }
        await handleValidate(options)
      }
      break

    case 'cleanup':
      {
        const target = args.slice(1).find((arg) => !arg.startsWith('-'))
        const options = {
          json: args.includes('--json'),
          dryRun: args.includes('--dry-run'),
          olderThan: parseInt(
            args.find((arg) => arg.startsWith('--older-than='))?.split('=')[1] ||
              '7',
          ),
          force: args.includes('--force') || args.includes('-f'),
        }
        await handleCleanup(target || null, options)
      }
      break

    default:
      console.error(`Error: Unknown command "${command}"`)
      console.log(
        'Available commands: init, remember, recall, scan, status, doctor, config, checkpoint, rollback, validate, cleanup',
      )
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
