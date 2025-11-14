import {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  DEFAULT_CONFIG,
  type UserConfig,
} from '../config/config'

/**
 * Handle the 'jarvis config' command
 * Supports subcommands: get, set, list, reset
 * @param args - Command line arguments after 'config'
 */
export default function handleConfigCommand(args: string[]): void {
  const subcommand = args[0]

  if (!subcommand || subcommand === 'list') {
    // List all configuration
    const config = loadConfig()
    console.log(JSON.stringify(config, null, 2))
    return
  }

  switch (subcommand) {
    case 'get': {
      const key = args[1]
      if (!key) {
        console.error('Error: Missing key argument for "get" command')
        console.log('Usage: jarvis config get <key>')
        process.exit(1)
      }

      if (!isValidConfigKey(key)) {
        console.error(`Error: Invalid config key "${key}"`)
        console.log('Valid keys: language, responseStyle, persona')
        process.exit(1)
      }

      const value = getConfigValue(key as keyof UserConfig)
      console.log(value)
      break
    }

    case 'set': {
      const key = args[1]
      const value = args[2]

      if (!key || !value) {
        console.error('Error: Missing arguments for "set" command')
        console.log('Usage: jarvis config set <key> <value>')
        process.exit(1)
      }

      if (!isValidConfigKey(key)) {
        console.error(`Error: Invalid config key "${key}"`)
        console.log('Valid keys: language, responseStyle, persona')
        process.exit(1)
      }

      setConfigValue(key as keyof UserConfig, value)
      console.log('✓ Config updated, Sir.')
      break
    }

    case 'reset': {
      saveConfig(DEFAULT_CONFIG)
      console.log('✓ Configuration reset to defaults, Sir.')
      break
    }

    default:
      console.error(`Error: Unknown subcommand "${subcommand}"`)
      console.log('Usage: jarvis config [get|set|list|reset]')
      process.exit(1)
  }
}

/**
 * Validate if a string is a valid UserConfig key
 * @param key - String to validate
 * @returns true if key is valid
 */
function isValidConfigKey(key: string): key is keyof UserConfig {
  return ['language', 'responseStyle', 'persona'].includes(key)
}
