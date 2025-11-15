/**
 * CLI Settings Manager
 *
 * Loads, validates, and provides access to CLI configuration.
 */

import {
  loadConfig,
  saveConfig,
  setConfigValue,
  DEFAULT_CONFIG,
  type UserConfig,
} from './config'

export interface Settings extends UserConfig {
  // Add CLI-specific settings here
  mcpServerUrl?: string
  timeout?: number
}

export class SettingsManager {
  private settings: Settings

  constructor() {
    this.settings = this.loadSettings()
  }

  /**
   * Load settings from config file
   */
  private loadSettings(): Settings {
    const baseConfig = loadConfig()

    // Add CLI defaults
    return {
      ...baseConfig,
      mcpServerUrl: process.env.JARVIS_MCP_URL || 'http://localhost:3000',
      timeout: 30000,
    }
  }

  /**
   * Get a setting value
   */
  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key]
  }

  /**
   * Get all settings
   */
  getAll(): Settings {
    return { ...this.settings }
  }

  /**
   * Set a setting value
   */
  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings[key] = value

    // Save to config if it's a user config key
    if (key in DEFAULT_CONFIG) {
      setConfigValue(key as keyof UserConfig, value as string)
    }
  }

  /**
   * Validate settings
   */
  validate(): boolean {
    // Validate language
    if (typeof this.settings.language !== 'string' || !this.settings.language) {
      return false
    }

    // Validate responseStyle
    const validStyles = ['concise', 'verbose', 'detailed']
    if (!validStyles.includes(this.settings.responseStyle)) {
      return false
    }

    // Validate persona
    if (typeof this.settings.persona !== 'string' || !this.settings.persona) {
      return false
    }

    // Validate MCP server URL
    if (this.settings.mcpServerUrl) {
      try {
        new URL(this.settings.mcpServerUrl)
      } catch {
        return false
      }
    }

    // Validate timeout
    if (
      this.settings.timeout !== undefined &&
      (typeof this.settings.timeout !== 'number' || this.settings.timeout <= 0)
    ) {
      return false
    }

    return true
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.settings = {
      ...DEFAULT_CONFIG,
      mcpServerUrl: 'http://localhost:3000',
      timeout: 30000,
    }

    // Save defaults to config
    saveConfig(DEFAULT_CONFIG)
  }

  /**
   * Get MCP server URL
   */
  getMCPServerUrl(): string {
    return this.settings.mcpServerUrl || 'http://localhost:3000'
  }

  /**
   * Get timeout value
   */
  getTimeout(): number {
    return this.settings.timeout || 30000
  }

  /**
   * Check if verbose mode is enabled
   */
  isVerbose(): boolean {
    return this.settings.responseStyle === 'verbose' || this.settings.responseStyle === 'detailed'
  }

  /**
   * Check if concise mode is enabled
   */
  isConcise(): boolean {
    return this.settings.responseStyle === 'concise'
  }
}

/**
 * Global settings instance
 */
let globalSettings: SettingsManager | null = null

/**
 * Get global settings instance
 */
export function getSettings(): SettingsManager {
  if (!globalSettings) {
    globalSettings = new SettingsManager()
  }
  return globalSettings
}

/**
 * Reset global settings instance
 */
export function resetSettings(): void {
  globalSettings = null
}

/**
 * Convenience functions
 */
export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
  return getSettings().get(key)
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  getSettings().set(key, value)
}

export function validateSettings(): boolean {
  return getSettings().validate()
}
