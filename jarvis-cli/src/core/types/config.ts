/**
 * Configuration type definitions for JARVIS CLI
 * 
 * Defines types for global and project-level configuration with validation.
 */

/**
 * Global configuration settings that apply to all JARVIS instances.
 * 
 * @example
 * ```typescript
 * const globalConfig: GlobalConfig = {
 *   language: "en",
 *   responseStyle: "concise",
 *   persona: "jarvis"
 * };
 * ```
 */
export interface GlobalConfig {
  /** Language code (currently only "en" is supported) */
  language: "en";

  /** Response style preference */
  responseStyle: "concise" | "verbose";

  /** Persona identifier (currently only "jarvis" is supported) */
  persona: "jarvis";
}

/**
 * Project-specific configuration that extends global settings.
 * 
 * Stored in `.jarvis/config.json` in each project directory.
 * 
 * @example
 * ```typescript
 * const projectConfig: ProjectConfig = {
 *   language: "en",
 *   responseStyle: "concise",
 *   persona: "jarvis",
 *   autoCapture: true,
 *   checkpointBeforeRisky: true,
 *   initialized_at: "2025-11-15T10:30:00Z"
 * };
 * ```
 */
export interface ProjectConfig extends GlobalConfig {
  /** Enable automatic code capture on file changes */
  autoCapture: boolean;

  /** Create checkpoint before risky operations */
  checkpointBeforeRisky: boolean;

  /** ISO 8601 timestamp when project was initialized */
  initialized_at: string;
}

/**
 * Configuration layer priority for merging settings.
 * 
 * Lower numbers have higher priority (override higher numbers).
 * 
 * @example
 * ```typescript
 * // Layer 1 (highest priority): Project config
 * const projectConfig = loadProjectConfig();
 * 
 * // Layer 2: Global config
 * const globalConfig = loadGlobalConfig();
 * 
 * // Layer 3 (lowest priority): Defaults
 * const finalConfig = mergeConfig(defaults, globalConfig, projectConfig);
 * ```
 */
export type ConfigLayer = 1 | 2 | 3;

/**
 * Configuration merge result with source tracking.
 * 
 * @example
 * ```typescript
 * const merged: MergedConfig = {
 *   config: {
 *     language: "en",
 *     responseStyle: "verbose",
 *     autoCapture: true
 *   },
 *   sources: {
 *     language: 2, // From global config
 *     responseStyle: 1, // From project config
 *     autoCapture: 1 // From project config
 *   }
 * };
 * ```
 */
export interface MergedConfig {
  /** Final merged configuration values */
  config: ProjectConfig;

  /** Source layer for each config key (1=project, 2=global, 3=default) */
  sources: Partial<Record<keyof ProjectConfig, ConfigLayer>>;
}

