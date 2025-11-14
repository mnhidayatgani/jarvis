#!/usr/bin/env node

// src/config/config.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
var DEFAULT_CONFIG = {
  language: "en",
  responseStyle: "concise",
  persona: "jarvis"
};
function getConfigPath() {
  const homeDir = os.homedir();
  const jarvisDir = path.join(homeDir, ".jarvis");
  if (!fs.existsSync(jarvisDir)) {
    fs.mkdirSync(jarvisDir, { recursive: true });
  }
  return path.join(jarvisDir, "config.json");
}
function loadConfig() {
  const configPath = getConfigPath();
  try {
    if (!fs.existsSync(configPath)) {
      saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    const fileContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(fileContent);
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error("Error loading config, using defaults:", error);
    return DEFAULT_CONFIG;
  }
}
function saveConfig(config) {
  const configPath = getConfigPath();
  const jsonContent = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath, jsonContent, "utf-8");
}
function getConfigValue(key) {
  const config = loadConfig();
  return config[key];
}
function setConfigValue(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

// src/commands/config.ts
function handleConfigCommand(args) {
  const subcommand = args[0];
  if (!subcommand || subcommand === "list") {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  switch (subcommand) {
    case "get": {
      const key = args[1];
      if (!key) {
        console.error('Error: Missing key argument for "get" command');
        console.log("Usage: jarvis config get <key>");
        process.exit(1);
      }
      if (!isValidConfigKey(key)) {
        console.error(`Error: Invalid config key "${key}"`);
        console.log("Valid keys: language, responseStyle, persona");
        process.exit(1);
      }
      const value = getConfigValue(key);
      console.log(value);
      break;
    }
    case "set": {
      const key = args[1];
      const value = args[2];
      if (!key || !value) {
        console.error('Error: Missing arguments for "set" command');
        console.log("Usage: jarvis config set <key> <value>");
        process.exit(1);
      }
      if (!isValidConfigKey(key)) {
        console.error(`Error: Invalid config key "${key}"`);
        console.log("Valid keys: language, responseStyle, persona");
        process.exit(1);
      }
      setConfigValue(key, value);
      console.log("\u2713 Config updated, Sir.");
      break;
    }
    case "reset": {
      saveConfig(DEFAULT_CONFIG);
      console.log("\u2713 Configuration reset to defaults, Sir.");
      break;
    }
    default:
      console.error(`Error: Unknown subcommand "${subcommand}"`);
      console.log("Usage: jarvis config [get|set|list|reset]");
      process.exit(1);
  }
}
function isValidConfigKey(key) {
  return ["language", "responseStyle", "persona"].includes(key);
}

// src/index.ts
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command) {
    console.log("JARVIS CLI Initialized, Sir.");
    return;
  }
  switch (command) {
    case "config":
      handleConfigCommand(args.slice(1));
      break;
    default:
      console.error(`Error: Unknown command "${command}"`);
      console.log("Available commands: config");
      process.exit(1);
  }
}
main();
