import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  getConfigPath,
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  DEFAULT_CONFIG,
  type UserConfig,
} from '../src/config/config'

// Mock fs and os modules
vi.mock('fs')
vi.mock('os')

describe('Configuration Management', () => {
  const mockHomeDir = '/home/testuser'
  const mockConfigPath = path.join(mockHomeDir, '.jarvis', 'config.json')
  const mockConfig: UserConfig = {
    language: 'en',
    responseStyle: 'verbose',
    persona: 'jarvis',
  }

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Mock os.homedir to return consistent path
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getConfigPath', () => {
    it('should return correct config path', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const configPath = getConfigPath()

      expect(configPath).toBe(mockConfigPath)
    })

    it('should create .jarvis directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)

      getConfigPath()

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.jarvis'),
        { recursive: true },
      )
    })
  })

  describe('loadConfig', () => {
    it('should create config file with defaults if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true) // .jarvis dir exists
      vi.mocked(fs.existsSync).mockReturnValueOnce(false) // config.json does not exist
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)

      const config = loadConfig()

      expect(config).toEqual(DEFAULT_CONFIG)
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        'utf-8',
      )
    })

    it('should read existing config file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockConfig, null, 2),
      )

      const config = loadConfig()

      expect(config).toEqual(mockConfig)
      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf-8')
    })

    it('should merge with defaults if config is missing keys', () => {
      const partialConfig = { language: 'es' }
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(partialConfig))

      const config = loadConfig()

      expect(config).toEqual({
        ...DEFAULT_CONFIG,
        ...partialConfig,
      })
    })

    it('should return defaults on parse error', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const config = loadConfig()

      expect(config).toEqual(DEFAULT_CONFIG)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('saveConfig', () => {
    it('should write config to file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)

      saveConfig(mockConfig)

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(mockConfig, null, 2),
        'utf-8',
      )
    })
  })

  describe('getConfigValue', () => {
    it('should return correct value for valid key', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockConfig, null, 2),
      )

      const value = getConfigValue('responseStyle')

      expect(value).toBe('verbose')
    })
  })

  describe('setConfigValue', () => {
    it('should update single config value', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockConfig, null, 2),
      )
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)

      setConfigValue('language', 'es')

      const expectedConfig = { ...mockConfig, language: 'es' }
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8',
      )
    })
  })
})
