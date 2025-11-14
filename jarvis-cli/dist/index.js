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

// src/commands/init.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, writeFileSync as writeFileSync2 } from "fs";
import { resolve, basename } from "path";
import { execSync } from "child_process";
import { createHash } from "crypto";

// src/utils/output.ts
var OutputFormatter = class {
  options;
  constructor(options = {}) {
    this.options = {
      quiet: false,
      json: false,
      verbose: false,
      color: true,
      ...options
    };
  }
  /**
   * Print success message
   */
  success(message, detail) {
    if (this.options.quiet)
      return;
    if (this.options.json) {
      this.printJson({ success: true, message, detail });
      return;
    }
    const formatted = detail ? `${this.green("\u2713")} ${detail}, Sir.` : `${this.green("\u2713")} ${message}, Sir.`;
    console.log(formatted);
  }
  /**
   * Print error message
   */
  error(message, error) {
    if (this.options.json) {
      this.printJson({
        success: false,
        error: message,
        details: error?.message,
        stack: this.options.verbose ? error?.stack : void 0
      });
      return;
    }
    const formatted = `${this.red("\u2717")} I apologize, Sir. ${message}`;
    console.error(formatted);
    if (error && this.options.verbose) {
      console.error(this.dim(error.stack || error.message));
    }
  }
  /**
   * Print warning message
   */
  warning(message) {
    if (this.options.quiet)
      return;
    if (this.options.json) {
      this.printJson({ warning: message });
      return;
    }
    console.log(`${this.yellow("\u26A0")} Sir, ${message}`);
  }
  /**
   * Print info message
   */
  info(message, addressSir = true) {
    if (this.options.quiet)
      return;
    if (this.options.json) {
      this.printJson({ info: message });
      return;
    }
    const formatted = addressSir ? `${message}, Sir.` : message;
    console.log(formatted);
  }
  /**
   * Print progress message
   */
  progress(message) {
    if (this.options.quiet)
      return;
    console.log(`${this.dim("...")} ${message}`);
  }
  /**
   * Print list of items
   */
  list(items, prefix) {
    if (this.options.quiet)
      return;
    if (this.options.json) {
      this.printJson({ items, prefix });
      return;
    }
    if (prefix) {
      console.log(prefix);
    }
    items.forEach((item) => {
      console.log(`  ${this.cyan("\u2022")} ${item}`);
    });
  }
  /**
   * Print table
   */
  table(headers, rows) {
    if (this.options.quiet)
      return;
    if (this.options.json) {
      this.printJson({
        headers,
        rows
      });
      return;
    }
    const colWidths = headers.map((h) => h.length);
    rows.forEach((row) => {
      row.forEach((cell, i) => {
        colWidths[i] = Math.max(colWidths[i], cell.length);
      });
    });
    const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(" | ");
    console.log(this.bold(headerLine));
    const separator = colWidths.map((w) => "-".repeat(w)).join("-+-");
    console.log(separator);
    rows.forEach((row) => {
      const rowLine = row.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ");
      console.log(rowLine);
    });
  }
  /**
   * Print JSON output
   */
  printJson(data) {
    console.log(JSON.stringify(data, null, this.options.verbose ? 2 : 0));
  }
  /**
   * Print raw data
   */
  raw(data) {
    console.log(data);
  }
  /**
   * Color helpers
   */
  green(text) {
    return this.colorize(text, "\x1B[32m");
  }
  red(text) {
    return this.colorize(text, "\x1B[31m");
  }
  yellow(text) {
    return this.colorize(text, "\x1B[33m");
  }
  cyan(text) {
    return this.colorize(text, "\x1B[36m");
  }
  dim(text) {
    return this.colorize(text, "\x1B[2m");
  }
  bold(text) {
    return this.colorize(text, "\x1B[1m");
  }
  colorize(text, colorCode) {
    if (!this.options.color) {
      return text;
    }
    return `${colorCode}${text}\x1B[0m`;
  }
};
function getFormatter(flags = {}) {
  return new OutputFormatter({
    quiet: flags.quiet || false,
    json: flags.json || false,
    verbose: flags.verbose || false,
    color: !flags.noColor && process.stdout.isTTY
  });
}
var defaultFormatter = new OutputFormatter();

// src/commands/init.ts
async function handleInitCommand(options = {}) {
  const output = getFormatter(options);
  try {
    const projectRoot = detectProjectRoot();
    output.progress("Initializing JARVIS memory system...");
    const jarvisDir = resolve(projectRoot, ".jarvis");
    if (existsSync2(jarvisDir)) {
      if (!options.force) {
        output.warning(".jarvis directory already exists");
        output.info(
          "Use --force to reinitialize (this will preserve existing data)",
          false
        );
        process.exit(1);
      }
      output.info("Reinitializing existing .jarvis directory", false);
    }
    const isGitRepo = checkGitRepository(projectRoot);
    if (!isGitRepo) {
      output.warning(
        "Not a git repository - auto-capture features will be limited"
      );
      output.info(
        'Run "git init" to enable full auto-capture capabilities',
        false
      );
    }
    createDirectoryStructure(jarvisDir);
    output.progress("Created directory structure");
    createConfigFile(jarvisDir);
    output.progress("Created configuration file");
    const projectName = basename(projectRoot);
    const projectId = generateProjectId(projectRoot);
    initializeDatabases(jarvisDir, projectId);
    output.progress("Initialized databases");
    createProjectContext(jarvisDir, projectId, projectName, projectRoot);
    output.progress("Created project context");
    output.success("JARVIS memory system initialized");
    if (options.verbose) {
      output.info("Project details:", false);
      output.list([
        `Name: ${projectName}`,
        `Root: ${projectRoot}`,
        `ID: ${projectId.substring(0, 16)}...`,
        `Git: ${isGitRepo ? "Yes" : "No"}`
      ]);
    }
    output.info('Run "jarvis status" to view memory system status', false);
  } catch (error) {
    output.error(
      "Failed to initialize JARVIS",
      error instanceof Error ? error : void 0
    );
    process.exit(1);
  }
}
function detectProjectRoot() {
  let currentDir = process.cwd();
  const indicators = [
    "package.json",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    ".git"
  ];
  for (const indicator of indicators) {
    if (existsSync2(resolve(currentDir, indicator))) {
      return currentDir;
    }
  }
  return currentDir;
}
function checkGitRepository(projectRoot) {
  try {
    execSync("git rev-parse --git-dir", {
      cwd: projectRoot,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}
function createDirectoryStructure(jarvisDir) {
  if (!existsSync2(jarvisDir)) {
    mkdirSync2(jarvisDir, { recursive: true });
  }
  const subdirs = ["db", "snapshots"];
  for (const subdir of subdirs) {
    const path2 = resolve(jarvisDir, subdir);
    if (!existsSync2(path2)) {
      mkdirSync2(path2, { recursive: true });
    }
  }
}
function createConfigFile(jarvisDir) {
  const configPath = resolve(jarvisDir, "config.json");
  if (!existsSync2(configPath)) {
    const config = {
      ...DEFAULT_CONFIG,
      initialized_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeFileSync2(configPath, JSON.stringify(config, null, 2), "utf-8");
  }
}
function generateProjectId(projectRoot) {
  const absolutePath = resolve(projectRoot);
  return createHash("sha256").update(absolutePath).digest("hex");
}
function initializeDatabases(jarvisDir, projectId) {
  const dbPath = resolve(jarvisDir, "db", "memory.db");
  const chromaPath = resolve(jarvisDir, "db", "chroma");
  if (!existsSync2(chromaPath)) {
    mkdirSync2(chromaPath, { recursive: true });
  }
}
function createProjectContext(jarvisDir, projectId, projectName, projectRoot) {
  const contextPath = resolve(jarvisDir, "project_context.json");
  const context = {
    id: projectId,
    name: projectName,
    root_path: projectRoot,
    tech_stack: [],
    dependencies: {},
    file_structure_map: {},
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeFileSync2(contextPath, JSON.stringify(context, null, 2), "utf-8");
}
function parseInitArgs(args) {
  const options = {};
  for (const arg of args) {
    if (arg === "--force" || arg === "-f") {
      options.force = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    }
  }
  return options;
}

// src/commands/remember.ts
import { readFileSync as readFileSync2 } from "fs";

// src/api/mcp-client.ts
var MCPClient = class {
  serverUrl;
  timeout;
  constructor(serverUrl = "http://localhost:3000", timeout = 3e4) {
    this.serverUrl = serverUrl;
    this.timeout = timeout;
  }
  /**
   * Call an MCP tool on the server
   */
  async callTool(tool, args = {}) {
    try {
      const response = await this.makeRequest("/tools/call", {
        tool,
        arguments: args
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }
  /**
   * Remember context (store memory)
   */
  async rememberContext(params) {
    return this.callTool("remember_context", {
      content: params.content,
      type: params.type || "decision",
      tags: params.tags || [],
      file_path: params.file_path,
      metadata: params.metadata || {}
    });
  }
  /**
   * Recall context (search memory)
   */
  async recallContext(params) {
    return this.callTool("recall_context", {
      query: params.query,
      type_filter: params.type_filter,
      file_filter: params.file_filter,
      since: params.since,
      limit: params.limit || 10
    });
  }
  /**
   * Analyze codebase
   */
  async analyzeCodebase(projectPath, options = {}) {
    return this.callTool("analyze_codebase", {
      project_path: projectPath,
      ...options
    });
  }
  /**
   * Get architecture/project structure
   */
  async getArchitecture() {
    return this.callTool("get_architecture", {});
  }
  /**
   * Create safety checkpoint
   */
  async createCheckpoint(reason, filesAffected = []) {
    return this.callTool("create_checkpoint", {
      reason,
      files_affected: filesAffected
    });
  }
  /**
   * Rollback to previous state
   */
  async rollback(checkpointId) {
    return this.callTool("rollback", {
      checkpoint_id: checkpointId
    });
  }
  /**
   * Validate pending changes
   */
  async validateChanges(changes) {
    return this.callTool("validate_changes", {
      changes
    });
  }
  /**
   * Check server health
   */
  async healthCheck() {
    try {
      const response = await this.makeRequest("/health", {});
      return response.success === true;
    } catch {
      return false;
    }
  }
  /**
   * Get server stats
   */
  async getStats() {
    try {
      return await this.makeRequest("/stats", {});
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get stats"
      };
    }
  }
  /**
   * Make HTTP request to MCP server
   */
  async makeRequest(endpoint, data) {
    await new Promise((resolve2) => setTimeout(resolve2, 100));
    return {
      success: true,
      data: {
        message: "MCP server not yet implemented",
        endpoint,
        request: data
      },
      message: "Note: This is a mock response. MCP server implementation pending."
    };
  }
};
var defaultClient = null;
function getDefaultClient() {
  if (!defaultClient) {
    const serverUrl = process.env.JARVIS_MCP_URL || "http://localhost:3000";
    defaultClient = new MCPClient(serverUrl);
  }
  return defaultClient;
}

// src/commands/remember.ts
async function handleRememberCommand(args, options = {}) {
  const output = getFormatter(options);
  try {
    let content;
    if (args.length > 0) {
      content = args.join(" ");
    } else {
      try {
        content = readFileSync2(0, "utf-8").trim();
      } catch {
        output.error('No content provided. Use: jarvis remember "content" or pipe via stdin');
        process.exit(1);
      }
    }
    if (!content || content.length === 0) {
      output.error("Content cannot be empty");
      process.exit(1);
    }
    output.progress("Storing to JARVIS memory...");
    const client = getDefaultClient();
    const result = await client.rememberContext({
      content,
      type: options.type || "decision",
      tags: options.tags || [],
      file_path: options.file
    });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      output.success("Memory stored");
      if (options.verbose && result.data?.memory_id) {
        output.info(`ID: ${result.data.memory_id.substring(0, 16)}...`, false);
        output.info(`Type: ${result.data.type || "decision"}`, false);
        if (result.data.timestamp) {
          output.info(`Time: ${new Date(result.data.timestamp).toLocaleString()}`, false);
        }
      }
    }
  } catch (error) {
    output.error(
      "Failed to store memory",
      error instanceof Error ? error : void 0
    );
    process.exit(1);
  }
}
function parseRememberArgs(args) {
  const options = {};
  const contentArgs = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--type" || arg === "-t") {
      options.type = args[++i];
    } else if (arg === "--tags") {
      const tagsStr = args[++i];
      options.tags = tagsStr.split(",").map((t) => t.trim());
    } else if (arg === "--file" || arg === "-f") {
      options.file = args[++i];
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (!arg.startsWith("-")) {
      contentArgs.push(arg);
    }
  }
  return { contentArgs, options };
}

// src/commands/recall.ts
async function handleRecallCommand(query, options = {}) {
  const output = getFormatter(options);
  try {
    if (!query || query.length === 0) {
      output.error('Query cannot be empty. Use: jarvis recall "search query"');
      process.exit(1);
    }
    output.progress("Searching JARVIS memory...");
    const client = getDefaultClient();
    const result = await client.recallContext({
      query,
      type_filter: options.type,
      file_filter: options.file,
      since: options.since,
      limit: options.limit || 10
    });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (!result.data?.results || result.data.results.length === 0) {
      output.info("No memories found matching your query", false);
      return;
    }
    output.success(`Found ${result.data.results.length} ${result.data.results.length === 1 ? "memory" : "memories"}`);
    for (const item of result.data.results) {
      console.log();
      console.log(`\u{1F4DD} ${item.content}`);
      if (options.verbose) {
        const details = [];
        if (item.type)
          details.push(`Type: ${item.type}`);
        if (item.file_path)
          details.push(`File: ${item.file_path}`);
        if (item.timestamp) {
          details.push(`Time: ${new Date(item.timestamp).toLocaleString()}`);
        }
        if (item.relevance_score !== void 0) {
          details.push(`Relevance: ${(item.relevance_score * 100).toFixed(1)}%`);
        }
        if (details.length > 0) {
          output.info(`   ${details.join(" | ")}`, false);
        }
      } else {
        if (item.timestamp) {
          const timeStr = new Date(item.timestamp).toLocaleDateString();
          console.log(`   ${timeStr}`);
        }
      }
    }
    console.log();
  } catch (error) {
    output.error(
      "Failed to recall memory",
      error instanceof Error ? error : void 0
    );
    process.exit(1);
  }
}
function parseRecallArgs(args) {
  const options = {};
  const queryParts = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--type" || arg === "-t") {
      options.type = args[++i];
    } else if (arg === "--file" || arg === "-f") {
      options.file = args[++i];
    } else if (arg === "--since" || arg === "-s") {
      options.since = args[++i];
    } else if (arg === "--limit" || arg === "-l") {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (!arg.startsWith("-")) {
      queryParts.push(arg);
    }
  }
  return { query: queryParts.join(" "), options };
}

// src/commands/scan.ts
async function handleScanCommand(options = {}) {
  const output = getFormatter(options);
  try {
    const projectPath = process.cwd();
    output.progress("Analyzing codebase...");
    const client = getDefaultClient();
    const result = await client.analyzeCodebase(projectPath, {
      verbose: options.verbose,
      interactive: options.interactive
    });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (!result.success) {
      output.error("Analysis failed", new Error(result.error || "Unknown error"));
      process.exit(1);
    }
    const analysis = result.data;
    output.success("Codebase analysis complete");
    console.log();
    if (analysis?.tech_stack && analysis.tech_stack.length > 0) {
      console.log("\u{1F4DA} Tech Stack:");
      output.list(analysis.tech_stack);
      console.log();
    }
    if (analysis?.dependencies) {
      const depCount = Object.keys(analysis.dependencies).length;
      if (depCount > 0) {
        console.log(`\u{1F4E6} Dependencies: ${depCount} detected`);
        if (options.verbose) {
          for (const [manager, deps] of Object.entries(analysis.dependencies)) {
            console.log(`   ${manager}:`);
            const depList = Array.isArray(deps) ? deps : Object.keys(deps);
            depList.slice(0, 10).forEach((dep) => {
              console.log(`     - ${dep}`);
            });
            if (depList.length > 10) {
              console.log(`     ... and ${depList.length - 10} more`);
            }
          }
        }
        console.log();
      }
    }
    if (analysis?.file_count !== void 0) {
      console.log(`\u{1F4C1} Files: ${analysis.file_count} analyzed`);
      if (analysis.directory_count) {
        console.log(`\u{1F4C2} Directories: ${analysis.directory_count}`);
      }
      console.log();
    }
    if (analysis?.inconsistencies && analysis.inconsistencies.length > 0) {
      console.log("\u26A0\uFE0F  Inconsistencies Detected:");
      analysis.inconsistencies.forEach((issue) => {
        console.log(`   \u2022 ${issue.type}: ${issue.description}`);
        if (options.verbose && issue.examples) {
          issue.examples.forEach((ex) => console.log(`     - ${ex}`));
        }
      });
      console.log();
    }
    if (analysis?.questions && analysis.questions.length > 0) {
      console.log("\u2753 Clarifying Questions:");
      analysis.questions.forEach((q, i) => {
        console.log(`   ${i + 1}. ${q}`);
      });
      console.log();
      if (options.interactive) {
        output.info("Run with --interactive to answer questions", false);
      }
    }
    if (options.verbose && analysis?.suggestions) {
      console.log("\u{1F4A1} Suggestions:");
      output.list(analysis.suggestions);
      console.log();
    }
    output.info("Project context stored in JARVIS memory", false);
  } catch (error) {
    output.error(
      "Failed to scan codebase",
      error instanceof Error ? error : void 0
    );
    process.exit(1);
  }
}
function parseScanArgs(args) {
  const options = {};
  for (const arg of args) {
    if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--interactive" || arg === "-i") {
      options.interactive = true;
    }
  }
  return options;
}

// src/index.ts
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command) {
    console.log("JARVIS CLI Initialized, Sir.");
    return;
  }
  switch (command) {
    case "init":
      await handleInitCommand(parseInitArgs(args.slice(1)));
      break;
    case "remember":
      {
        const { contentArgs, options } = parseRememberArgs(args.slice(1));
        await handleRememberCommand(contentArgs, options);
      }
      break;
    case "recall":
      {
        const { query, options } = parseRecallArgs(args.slice(1));
        await handleRecallCommand(query, options);
      }
      break;
    case "scan":
      await handleScanCommand(parseScanArgs(args.slice(1)));
      break;
    case "config":
      handleConfigCommand(args.slice(1));
      break;
    default:
      console.error(`Error: Unknown command "${command}"`);
      console.log("Available commands: init, remember, recall, scan, config");
      process.exit(1);
  }
}
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
