import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * User configuration interface for JARVIS global settings
 * Based on Constitution 2.2 - JARVIS Persona Standards
 */
export interface UserConfig {
  language: string
  responseStyle: string
  persona: string
}

/**
 * Default configuration values from Constitution 2.2
 */
export const DEFAULT_CONFIG: UserConfig = {
  language: 'en',
  responseStyle: 'concise',
  persona: 'jarvis',
}

/**
 * Get the absolute path to the global config file
 * Creates ~/.jarvis directory if it doesn't exist
 * @returns Absolute path to ~/.jarvis/config.json
 */
export function getConfigPath(): string {
  const homeDir = os.homedir()
  const jarvisDir = path.join(homeDir, '.jarvis')

  // Ensure .jarvis directory exists
  if (!fs.existsSync(jarvisDir)) {
    fs.mkdirSync(jarvisDir, { recursive: true })
  }

  return path.join(jarvisDir, 'config.json')
}

/**
 * Load configuration from ~/.jarvis/config.json
 * Creates file with DEFAULT_CONFIG if it doesn't exist
 * @returns UserConfig object
 */
export function loadConfig(): UserConfig {
  const configPath = getConfigPath()

  try {
    if (!fs.existsSync(configPath)) {
      // Create config file with defaults
      saveConfig(DEFAULT_CONFIG)
      return DEFAULT_CONFIG
    }

    const fileContent = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(fileContent) as UserConfig

    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_CONFIG, ...config }
  } catch (error) {
    // If parsing fails, return defaults
    console.error('Error loading config, using defaults:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * Save configuration to ~/.jarvis/config.json
 * @param config - UserConfig object to save
 */
export function saveConfig(config: UserConfig): void {
  const configPath = getConfigPath()
  const jsonContent = JSON.stringify(config, null, 2)
  fs.writeFileSync(configPath, jsonContent, 'utf-8')
}

/**
 * Get a single configuration value
 * @param key - Configuration key to retrieve
 * @returns Value of the configuration key
 */
export function getConfigValue(key: keyof UserConfig): string {
  const config = loadConfig()
  return config[key]
}

/**
 * Set a single configuration value
 * @param key - Configuration key to update
 * @param value - New value for the key
 */
export function setConfigValue(key: keyof UserConfig, value: string): void {
  const config = loadConfig()
  config[key] = value
  saveConfig(config)
}
