/**
 * Config Command - Manage JARVIS configuration
 * Refactored to use Command Pattern
 */

import { BaseCommand } from "./base/command";
import type { ConfigOptions, ConfigResult } from "./base/types";
import {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  DEFAULT_CONFIG,
  type UserConfig,
} from "../config/config";
import {
  ValidationError,
  MissingArgumentError,
  InvalidArgumentError,
} from "../core/errors";

const VALID_CONFIG_KEYS: (keyof UserConfig)[] = [
  "language",
  "responseStyle",
  "persona",
];

export class ConfigCommand extends BaseCommand<ConfigOptions, ConfigResult> {
  parse(args: string[]): ConfigOptions {
    const options: ConfigOptions = {};

    if (args.length === 0 || args[0] === "list") {
      options.list = true;
      return options;
    }

    const subcommand = args[0];

    switch (subcommand) {
      case "get":
        options.key = args[1];
        break;

      case "set":
        options.key = args[1];
        options.value = args[2];
        break;

      case "unset":
      case "reset":
        options.unset = true;
        break;

      default:
        throw new InvalidArgumentError(
          "subcommand",
          subcommand,
          "get|set|list|reset"
        );
    }

    return options;
  }

  validate(options: ConfigOptions): void {
    // List operation - no validation needed
    if (options.list || options.unset) {
      return;
    }

    // Get/Set operations require key
    if (!options.key) {
      throw new MissingArgumentError("key");
    }

    // Validate key is valid config property
    if (!this.isValidConfigKey(options.key)) {
      throw new ValidationError(
        `Invalid config key "${options.key}". Valid keys: ${VALID_CONFIG_KEYS.join(", ")}`,
        "key",
        options.key
      );
    }

    // Set operation requires value
    if (options.value !== undefined && !options.value) {
      throw new MissingArgumentError("value");
    }
  }

  async execute(options: ConfigOptions): Promise<ConfigResult> {
    // List all configuration
    if (options.list) {
      const config = loadConfig();
      return {
        success: true,
        all: config,
      };
    }

    // Reset to defaults
    if (options.unset) {
      saveConfig(DEFAULT_CONFIG);
      return {
        success: true,
        all: DEFAULT_CONFIG,
      };
    }

    // Get single value
    if (options.key && options.value === undefined) {
      const value = getConfigValue(options.key as keyof UserConfig);
      return {
        success: true,
        key: options.key,
        value,
      };
    }

    // Set value
    if (options.key && options.value !== undefined) {
      setConfigValue(options.key as keyof UserConfig, options.value);
      return {
        success: true,
        key: options.key,
        value: options.value,
      };
    }

    throw new ValidationError(
      "Invalid operation - must specify list, get, set, or reset",
      "operation",
      options
    );
  }

  private isValidConfigKey(key: string): key is keyof UserConfig {
    return VALID_CONFIG_KEYS.includes(key as keyof UserConfig);
  }
}

// Legacy export for backward compatibility
export default function handleConfigCommand(args: string[]): void {
  try {
    const command = new ConfigCommand();
    const result = command.run(args).then((result) => {
      displayConfigResult(result);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

function displayConfigResult(result: ConfigResult): void {
  // List all configuration
  if (result.all) {
    console.log(JSON.stringify(result.all, null, 2));
    return;
  }

  // Get single value
  if (result.key && result.value !== undefined) {
    if (typeof result.value === "string") {
      console.log(result.value);
    } else {
      console.log(JSON.stringify(result.value));
    }
    return;
  }

  // Set confirmation
  if (result.success) {
    console.log("✓ Config updated, Sir.");
  }
}
