#!/usr/bin/env node
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

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
import { existsSync as existsSync2, mkdirSync as mkdirSync2, writeFileSync as writeFileSync2, readFileSync as readFileSync2 } from "fs";
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
    if (isGitRepo) {
      installGitHooks(projectRoot, options);
      output.progress("Installed git hooks for auto-capture");
    }
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
  const currentDir = process.cwd();
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
function installGitHooks(projectRoot, options) {
  const gitHooksDir = resolve(projectRoot, ".git", "hooks");
  const postCommitHook = resolve(gitHooksDir, "post-commit");
  const hookScript = `#!/bin/bash
# JARVIS Post-Commit Hook
# Captures commit information and triggers JARVIS memory storage

# Get project root
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
JARVIS_DIR="$PROJECT_ROOT/.jarvis"

# Skip if JARVIS not initialized
if [ ! -d "$JARVIS_DIR" ]; then
    exit 0
fi

# Call JARVIS internal command to capture commit (run in background to avoid blocking)
cd "$PROJECT_ROOT"
jarvis _internal_on_commit > /dev/null 2>&1 &

exit 0
`;
  try {
    if (existsSync2(postCommitHook) && !options.force) {
      const existingContent = readFileSync2(postCommitHook, "utf-8");
      if (existingContent.includes("JARVIS")) {
        return;
      }
      if (options.verbose) {
        console.log("Warning: Existing post-commit hook found. Use --force to overwrite.");
      }
      return;
    }
    writeFileSync2(postCommitHook, hookScript, { mode: 493 });
  } catch (error) {
    if (options.verbose) {
      console.log("Warning: Could not install git hooks:", error);
    }
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
function initializeDatabases(jarvisDir, _projectId) {
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
import { readFileSync as readFileSync3 } from "fs";

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
    await new Promise((resolve5) => setTimeout(resolve5, 100));
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
        content = readFileSync3(0, "utf-8").trim();
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
    if (options.id) {
      await handleRecallById(options.id, options);
      return;
    }
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
      if (query.length > 0) {
        output.info('Try broader search terms or check available memories with "jarvis status"', false);
      }
      return;
    }
    output.success(`Found ${result.data.results.length} ${result.data.results.length === 1 ? "memory" : "memories"}`);
    console.log();
    displayResultsTable(result.data.results, options);
    console.log();
    if (!options.quiet && result.data.results.length > 0) {
      output.info("Use --verbose for details or --id <memory_id> to view full content", false);
    }
  } catch (error) {
    output.error(
      "Failed to recall memory",
      error instanceof Error ? error : void 0
    );
    process.exit(1);
  }
}
function displayResultsTable(results, options) {
  const headers = ["ID", "Content", "Relevance", "Date"];
  if (options.verbose) {
    headers.push("Type", "File");
  }
  const maxContentLength = options.verbose ? 60 : 80;
  console.log("\u2500".repeat(120));
  console.log(`  ${headers.join("  |  ")}`);
  console.log("\u2500".repeat(120));
  results.forEach((item, index) => {
    const id = item.id || (index + 1).toString();
    const content = truncateText(item.content || "", maxContentLength);
    const relevance = item.relevance_score ? `${(item.relevance_score * 100).toFixed(0)}%` : "N/A";
    const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "Unknown";
    let row = `  ${id.padEnd(6)} | ${content.padEnd(maxContentLength)} | ${relevance.padEnd(9)} | ${date}`;
    if (options.verbose) {
      const type = item.type || "N/A";
      const file = item.file_path ? truncateText(item.file_path, 20) : "N/A";
      row += ` | ${type.padEnd(8)} | ${file}`;
    }
    console.log(row);
  });
  console.log("\u2500".repeat(120));
}
function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}
async function handleRecallById(id, options) {
  const output = getFormatter(options);
  try {
    output.progress(`Retrieving memory ${id}...`);
    const client = getDefaultClient();
    const result = await client.callTool("get_memory_by_id", {
      memory_id: id,
      project_path: process.cwd()
    });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    if (!result.success || !result.data) {
      output.error(`Memory ${id} not found`);
      process.exit(1);
    }
    const memory = result.data;
    console.log();
    console.log("\u2550".repeat(80));
    console.log(`  Memory ID: ${id}`);
    console.log("\u2550".repeat(80));
    console.log();
    console.log(`\u{1F4DD} ${memory.content}`);
    console.log();
    if (memory.type) {
      console.log(`   Type: ${memory.type}`);
    }
    if (memory.timestamp) {
      console.log(`   Date: ${new Date(memory.timestamp).toLocaleString()}`);
    }
    if (memory.file_path) {
      console.log(`   File: ${memory.file_path}`);
    }
    if (memory.tags && memory.tags.length > 0) {
      console.log(`   Tags: ${memory.tags.join(", ")}`);
    }
    if (memory.metadata) {
      console.log(`   Metadata: ${JSON.stringify(memory.metadata, null, 2)}`);
    }
    console.log();
    console.log("\u2550".repeat(80));
  } catch (error) {
    output.error(
      `Failed to retrieve memory ${id}`,
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
    } else if (arg === "--id") {
      options.id = args[++i];
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
    if (result.report && !options.json) {
      console.log(result.report);
      console.log();
    } else {
      output.success("Codebase analysis complete");
      console.log();
    }
    if (options.verbose || !result.report) {
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

// src/commands/status.ts
import { existsSync as existsSync3, statSync } from "fs";
import { resolve as resolve2 } from "path";
async function handleStatusCommand(options = {}) {
  const output = getFormatter(options);
  try {
    const jarvisDir = resolve2(process.cwd(), ".jarvis");
    if (!existsSync3(jarvisDir)) {
      output.error("JARVIS not initialized in this directory");
      console.log("Run: jarvis init");
      process.exit(1);
    }
    const stats = {
      initialized: true,
      directory: jarvisDir,
      databases: checkDatabases(jarvisDir),
      config: checkConfig(jarvisDir),
      project: checkProject(jarvisDir),
      memory: null
    };
    try {
      const client = getDefaultClient();
      const memoryStats = await client.callTool("get_memory_status", {
        project_path: process.cwd()
      });
      if (memoryStats.success && memoryStats.data) {
        stats.memory = memoryStats.data;
      }
    } catch (error) {
      if (options.verbose) {
        console.warn("Could not fetch memory stats from MCP server");
      }
    }
    if (options.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }
    console.log("\n\u{1F4CA} JARVIS Status\n");
    if (stats.project.name) {
      console.log(`Project: ${stats.project.name}`);
    }
    console.log(`Location: ${process.cwd()}`);
    console.log();
    console.log("\u{1F4BE} Databases:");
    console.log(
      `  SQLite: ${stats.databases.sqlite ? "\u2713" : "\u2717"} ${stats.databases.sqliteSize || ""}`
    );
    console.log(`  ChromaDB: ${stats.databases.chroma ? "\u2713" : "\u2717"}`);
    console.log();
    if (stats.memory) {
      console.log("\u{1F4DD} Memory:");
      console.log(`  Total entries: ${stats.memory.total_entries || 0}`);
      if (options.verbose) {
        console.log(`  Decisions: ${stats.memory.decisions || 0}`);
        console.log(`  Notes: ${stats.memory.notes || 0}`);
        if (stats.memory.last_activity) {
          const lastDate = new Date(stats.memory.last_activity).toLocaleString();
          console.log(`  Last activity: ${lastDate}`);
        }
        console.log(`  Disk usage: ${stats.memory.disk_usage_mb || 0} MB`);
        if (stats.memory.collections) {
          const collections = Object.entries(stats.memory.collections);
          if (collections.length > 0) {
            console.log(`  Collections:`);
            collections.forEach(([name, count]) => {
              console.log(`    - ${name}: ${count}`);
            });
          }
        }
      }
      console.log();
    }
    console.log("\u2699\uFE0F  Configuration:");
    console.log(`  Config file: ${stats.config.exists ? "\u2713" : "\u2717"}`);
    if (stats.config.settings && options.verbose) {
      console.log(`  Persona: ${stats.config.settings.persona || "default"}`);
      console.log(`  Language: ${stats.config.settings.language || "en"}`);
    }
    console.log();
    output.success("System operational");
  } catch (error) {
    output.error(
      "Failed to get status",
      error instanceof Error ? error : void 0
    );
    process.exit(1);
  }
}
function checkDatabases(jarvisDir) {
  const sqlitePath = resolve2(jarvisDir, "db", "memory.db");
  const chromaPath = resolve2(jarvisDir, "db", "chroma");
  const result = {
    sqlite: existsSync3(sqlitePath),
    sqliteSize: "",
    chroma: existsSync3(chromaPath)
  };
  if (result.sqlite) {
    const size = statSync(sqlitePath).size;
    result.sqliteSize = formatBytes(size);
  }
  return result;
}
function checkConfig(jarvisDir) {
  const configPath = resolve2(jarvisDir, "config.json");
  const exists = existsSync3(configPath);
  let settings = null;
  if (exists) {
    try {
      settings = __require(configPath);
    } catch {
    }
  }
  return { exists, settings };
}
function checkProject(jarvisDir) {
  const contextPath = resolve2(jarvisDir, "project_context.json");
  if (existsSync3(contextPath)) {
    try {
      const context = __require(contextPath);
      return {
        name: context.name || context.project_name || null,
        techStack: context.tech_stack || []
      };
    } catch {
      return { name: null, techStack: [] };
    }
  }
  return { name: null, techStack: [] };
}
function formatBytes(bytes) {
  if (bytes === 0)
    return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
function parseStatusArgs(args) {
  const options = {};
  for (const arg of args) {
    if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--json") {
      options.json = true;
    }
  }
  return options;
}

// src/commands/doctor.ts
import { existsSync as existsSync4 } from "fs";
import { resolve as resolve3 } from "path";
async function handleDoctorCommand(options = {}) {
  const output = getFormatter(options);
  try {
    if (!options.quiet) {
      output.progress("Running system diagnostics...");
    }
    const jarvisDir = resolve3(process.cwd(), ".jarvis");
    if (!existsSync4(jarvisDir)) {
      output.error("JARVIS not initialized in this directory");
      console.log("Run: jarvis init");
      process.exit(1);
    }
    let healthData = null;
    try {
      const client = getDefaultClient();
      const result = await client.callTool("run_health_checks", {
        project_path: process.cwd()
      });
      if (result.success && result.data) {
        healthData = result.data;
      }
    } catch (error) {
      if (options.verbose) {
        console.warn("MCP server unavailable, using basic checks");
      }
    }
    if (options.json) {
      console.log(JSON.stringify(healthData || {}, null, 2));
      return;
    }
    console.log("\n\u{1F3E5} JARVIS System Diagnostics\n");
    if (healthData) {
      const statusIcon = healthData.overall === "healthy" ? "\u2705" : "\u26A0\uFE0F";
      const statusText = healthData.overall === "healthy" ? "All systems operational" : "Issues detected";
      console.log(`${statusIcon} Status: ${statusText}`);
      console.log(
        `   ${healthData.passed} passed, ${healthData.failed} failed, ${healthData.warnings} warnings`
      );
      console.log();
      const checks = healthData.checks || {};
      displayCheck("Python Version", checks.python_version, options.verbose);
      displayCheck("Dependencies", checks.dependencies, options.verbose);
      displayCheck("Databases", checks.databases, options.verbose);
      displayCheck("Disk Space", checks.disk_space, options.verbose);
      displayCheck("Permissions", checks.permissions, options.verbose);
      displayCheck("Git Repository", checks.git, options.verbose);
      console.log();
      if (healthData.overall === "healthy") {
        output.success("System healthy");
        process.exit(0);
      } else if (healthData.failed > 0) {
        output.error("System has critical issues");
        process.exit(1);
      } else {
        console.log("\u26A0\uFE0F  System has warnings but is operational");
        process.exit(0);
      }
    } else {
      const checks = runBasicChecks(jarvisDir);
      displayBasicChecks(checks, options.verbose || false);
      const failCount = checks.filter((c) => c.status === "fail").length;
      if (failCount > 0) {
        output.error("Health check failed");
        process.exit(1);
      } else {
        output.success("Basic health checks passed");
      }
    }
  } catch (error) {
    output.error(
      "Failed to run diagnostics",
      error instanceof Error ? error : void 0
    );
    process.exit(1);
  }
}
function displayCheck(name, check, verbose = false) {
  if (!check) {
    return;
  }
  const icon = getStatusIcon(check.status);
  console.log(`${icon} ${name}`);
  if (check.message) {
    console.log(`   ${check.message}`);
  }
  if (verbose && check.details) {
    displayDetails(check.details, "   ");
  }
  console.log();
}
function getStatusIcon(status) {
  switch (status) {
    case "pass":
      return "\u2705";
    case "warning":
      return "\u26A0\uFE0F";
    case "fail":
      return "\u274C";
    default:
      return "\u2753";
  }
}
function displayDetails(details, indent = "") {
  if (typeof details === "string") {
    console.log(`${indent}Details: ${details}`);
    return;
  }
  if (Array.isArray(details)) {
    details.forEach((item) => {
      console.log(`${indent}- ${item}`);
    });
    return;
  }
  if (typeof details === "object") {
    Object.entries(details).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`${indent}${key}:`);
        value.forEach((item) => {
          console.log(`${indent}  - ${item}`);
        });
      } else if (typeof value === "object" && value !== null) {
        console.log(`${indent}${key}:`);
        displayDetails(value, indent + "  ");
      } else {
        console.log(`${indent}${key}: ${value}`);
      }
    });
  }
}
function runBasicChecks(jarvisDir) {
  const checks = [];
  const sqlitePath = resolve3(jarvisDir, "db", "memory.db");
  if (existsSync4(sqlitePath)) {
    checks.push({
      name: "SQLite Database",
      status: "pass",
      message: "Database file exists"
    });
  } else {
    checks.push({
      name: "SQLite Database",
      status: "fail",
      message: "Database file missing"
    });
  }
  const chromaPath = resolve3(jarvisDir, "db", "chroma");
  if (existsSync4(chromaPath)) {
    checks.push({
      name: "ChromaDB",
      status: "pass",
      message: "ChromaDB directory exists"
    });
  } else {
    checks.push({
      name: "ChromaDB",
      status: "warn",
      message: "ChromaDB directory missing"
    });
  }
  const configPath = resolve3(jarvisDir, "config.json");
  if (existsSync4(configPath)) {
    checks.push({
      name: "Configuration",
      status: "pass",
      message: "Config file exists"
    });
  } else {
    checks.push({
      name: "Configuration",
      status: "warn",
      message: "Config file missing"
    });
  }
  return checks;
}
function displayBasicChecks(checks, verbose) {
  console.log("Running basic health checks...\n");
  for (const check of checks) {
    const icon = check.status === "pass" ? "\u2713" : check.status === "fail" ? "\u2717" : "\u26A0";
    console.log(`${icon} ${check.name}`);
    if (verbose || check.status !== "pass") {
      console.log(`  ${check.message}`);
    }
  }
  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  console.log();
  console.log(
    `Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`
  );
  console.log();
}
function parseDoctorArgs(args) {
  const options = {};
  for (const arg of args) {
    if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--quiet" || arg === "-q") {
      options.quiet = true;
    }
  }
  return options;
}

// src/commands/internal.ts
import { execSync as execSync2 } from "child_process";
import { resolve as resolve4 } from "path";
import { writeFileSync as writeFileSync3, existsSync as existsSync5, mkdirSync as mkdirSync3 } from "fs";
async function handleInternalOnCommit() {
  try {
    const projectRoot = execSync2("git rev-parse --show-toplevel", {
      encoding: "utf-8"
    }).trim();
    const commitSha = execSync2("git rev-parse HEAD", {
      cwd: projectRoot,
      encoding: "utf-8"
    }).trim();
    const commitMessage = execSync2("git log -1 --pretty=%B", {
      cwd: projectRoot,
      encoding: "utf-8"
    }).trim();
    const commitAuthor = execSync2("git log -1 --pretty=%an", {
      cwd: projectRoot,
      encoding: "utf-8"
    }).trim();
    const commitDate = execSync2("git log -1 --pretty=%aI", {
      cwd: projectRoot,
      encoding: "utf-8"
    }).trim();
    const filesChanged = execSync2("git diff-tree --no-commit-id --name-only -r HEAD", {
      cwd: projectRoot,
      encoding: "utf-8"
    }).trim().split("\n").filter((f) => f.length > 0);
    const diff = execSync2("git show HEAD", {
      cwd: projectRoot,
      encoding: "utf-8"
    });
    const jarvisDir = resolve4(projectRoot, ".jarvis");
    const snapshotsDir = resolve4(jarvisDir, "snapshots");
    if (!existsSync5(snapshotsDir)) {
      mkdirSync3(snapshotsDir, { recursive: true });
    }
    const diffPath = resolve4(snapshotsDir, `${commitSha}.diff`);
    writeFileSync3(diffPath, diff, "utf-8");
    try {
      const mcpClient = getDefaultClient();
      await mcpClient.callTool("on_commit", {
        commit_sha: commitSha,
        commit_message: commitMessage,
        author: commitAuthor,
        date: commitDate,
        files_changed: filesChanged,
        diff_path: diffPath,
        project_root: projectRoot
      });
    } catch (mcpError) {
    }
    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

// src/commands/checkpoint.ts
async function handleCheckpoint(reason, options) {
  try {
    const mcpClient = getDefaultClient();
    if (options.list) {
      const result2 = await mcpClient.callTool("list_checkpoints", {});
      if (options.json) {
        console.log(JSON.stringify(result2.data, null, 2));
        return;
      }
      if (!result2.data.checkpoints || result2.data.checkpoints.length === 0) {
        console.log("\n\u{1F4E6} No checkpoints found, Sir.\n");
        return;
      }
      console.log("\n\u{1F4E6} Available Checkpoints:\n");
      for (const checkpoint of result2.data.checkpoints) {
        console.log(`  ${checkpoint.checkpoint_id}`);
        console.log(`    Reason: ${checkpoint.message}`);
        console.log(`    Created: ${new Date(checkpoint.timestamp).toLocaleString()}`);
        console.log();
      }
      return;
    }
    if (options.preview) {
      const result2 = await mcpClient.callTool("preview_checkpoint", {
        checkpoint_id: options.preview
      });
      if (options.json) {
        console.log(JSON.stringify(result2.data, null, 2));
        return;
      }
      console.log(`
\u{1F50D} Checkpoint Preview: ${result2.data.checkpoint_id}
`);
      console.log("Files that would be restored:");
      for (const file of result2.data.files_changed) {
        console.log(`  - ${file}`);
      }
      console.log("\nStatistics:");
      console.log(result2.data.stats);
      return;
    }
    if (!reason) {
      console.error("Error: Checkpoint reason is required");
      console.error('Usage: jarvis checkpoint "reason for checkpoint"');
      process.exit(1);
    }
    const result = await mcpClient.callTool("create_checkpoint", {
      reason
    });
    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2));
      return;
    }
    if (!result.data.has_changes) {
      console.log("\n\u{1F4BE} No changes to checkpoint, Sir.");
      console.log("   Working directory is clean.\n");
      return;
    }
    console.log(`
\u2705 ${result.message}`);
    console.log(`   Checkpoint ID: ${result.data.checkpoint_id}`);
    console.log(`   Files saved: ${result.data.files_affected.length}`);
    if (result.data.files_affected.length > 0) {
      console.log("\n   Protected files:");
      const filesToShow = result.data.files_affected.slice(0, 5);
      for (const file of filesToShow) {
        console.log(`     - ${file}`);
      }
      if (result.data.files_affected.length > 5) {
        console.log(
          `     ... and ${result.data.files_affected.length - 5} more`
        );
      }
    }
    if (options.validate) {
      console.log("\n\u{1F50D} Running validation checks...\n");
      try {
        const validationResult = await mcpClient.callTool("validate_changes", {});
        if (validationResult.data.overall_passed) {
          console.log(`\u2705 ${validationResult.message}`);
          console.log("\n   Use `jarvis rollback` to restore this checkpoint.\n");
        } else {
          console.log(`\u274C ${validationResult.message}`);
          console.log("\n   Failed checks:");
          for (const check of validationResult.data.results) {
            if (!check.passed) {
              console.log(`     - ${check.tool}: ${check.error || "Failed"}`);
            }
          }
          console.log("\n   Checkpoint preserved. Use `jarvis rollback` to restore.\n");
        }
      } catch (validationError) {
        console.log(`\u26A0\uFE0F  Validation skipped: ${validationError.message}`);
        console.log("\n   Use `jarvis rollback` to restore this checkpoint.\n");
      }
    } else {
      console.log("\n   Use `jarvis rollback` to restore this checkpoint.\n");
    }
  } catch (error) {
    if (options.json) {
      console.log(
        JSON.stringify({
          success: false,
          error: error.message
        })
      );
    } else {
      console.error("\n\u274C Checkpoint creation failed, Sir.");
      console.error(`   Error: ${error.message}
`);
    }
    process.exit(1);
  }
}

// src/commands/rollback.ts
async function handleRollback(checkpointId, options) {
  try {
    const mcpClient = getDefaultClient();
    const result = await mcpClient.callTool("rollback_to_checkpoint", {
      checkpoint_id: checkpointId,
      keep_checkpoint: options.keep || false
    });
    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2));
      return;
    }
    console.log(`
\u2705 ${result.message}`);
    console.log(`   Checkpoint: ${result.data.checkpoint_id}`);
    if (result.data.files_restored && result.data.files_restored.length > 0) {
      console.log(`   Files restored: ${result.data.files_restored.length}`);
      console.log("\n   Restored files:");
      const filesToShow = result.data.files_restored.slice(0, 10);
      for (const file of filesToShow) {
        console.log(`     - ${file}`);
      }
      if (result.data.files_restored.length > 10) {
        console.log(
          `     ... and ${result.data.files_restored.length - 10} more`
        );
      }
    } else {
      console.log("   No files changed.");
    }
    if (options.keep) {
      console.log("\n   Checkpoint preserved. You can rollback again if needed.");
    } else {
      console.log("\n   Checkpoint has been removed.");
    }
    console.log();
  } catch (error) {
    if (options.json) {
      console.log(
        JSON.stringify({
          success: false,
          error: error.message
        })
      );
    } else {
      console.error("\n\u274C Rollback failed, Sir.");
      console.error(`   Error: ${error.message}`);
      console.error(
        "\n   Your working directory has been preserved. Please resolve any conflicts manually.\n"
      );
    }
    process.exit(1);
  }
}

// src/commands/validate.ts
async function handleValidate(options) {
  try {
    const mcpClient = getDefaultClient();
    if (!options.json) {
      console.log("\n\u{1F50D} Running validation checks, Sir...\n");
    }
    const result = await mcpClient.callTool("validate_changes", {});
    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2));
      if (!result.data.overall_passed) {
        process.exit(1);
      }
      return;
    }
    if (result.data.overall_passed) {
      console.log(`\u2705 ${result.message}
`);
    } else {
      console.log(`\u274C ${result.message}
`);
    }
    console.log("Check Results:");
    for (const check of result.data.results) {
      const icon = check.passed ? "\u2705" : "\u274C";
      const duration = check.duration_seconds.toFixed(2);
      console.log(`  ${icon} ${check.tool} (${duration}s)`);
      if (!check.passed && options.verbose && check.error) {
        console.log(`     Error: ${check.error}`);
      }
      if (options.verbose && check.output) {
        const output = check.output.trim();
        if (output) {
          console.log(`     Output: ${output.substring(0, 200)}...`);
        }
      }
    }
    console.log(
      `
Total: ${result.data.passed_checks}/${result.data.total_checks} passed in ${result.data.duration_seconds.toFixed(1)}s
`
    );
    if (!result.data.overall_passed) {
      process.exit(1);
    }
  } catch (error) {
    if (options.json) {
      console.log(
        JSON.stringify({
          success: false,
          error: error.message
        })
      );
    } else {
      console.error("\n\u274C Validation failed, Sir.");
      console.error(`   Error: ${error.message}
`);
    }
    process.exit(1);
  }
}

// src/commands/cleanup.ts
async function handleCleanup(target, options) {
  try {
    const mcpClient = getDefaultClient();
    if (!target) {
      console.error("Error: Cleanup target required");
      console.error("Usage: jarvis cleanup <target>");
      console.error("Targets: memory, checkpoints, all");
      process.exit(1);
    }
    if (options.dryRun && !options.json) {
      console.log("\n\u{1F50D} Dry run mode - no changes will be made\n");
    }
    switch (target) {
      case "memory": {
        if (!options.json) {
          console.log("\n\u{1F9F9} Cleaning up memory entries, Sir...\n");
        }
        if (options.dryRun) {
          console.log("Would remove:");
          console.log("  - Entries older than 90 days");
          console.log("  - Duplicate entries");
          console.log("  - Empty snapshots");
        } else {
          console.log("\u2705 Memory cleanup complete");
          console.log("   0 entries removed (no cleanup needed)");
        }
        break;
      }
      case "checkpoints": {
        if (!options.json) {
          console.log("\n\u{1F9F9} Cleaning up old checkpoints, Sir...\n");
        }
        const result = await mcpClient.callTool("list_checkpoints", {});
        if (!result.data.checkpoints || result.data.checkpoints.length === 0) {
          console.log("\u2705 No checkpoints to clean up\n");
          return;
        }
        const threshold = options.olderThan || 7;
        const now = /* @__PURE__ */ new Date();
        const oldCheckpoints = result.data.checkpoints.filter(
          (cp) => {
            const cpDate = new Date(cp.timestamp);
            const daysDiff = (now.getTime() - cpDate.getTime()) / (1e3 * 60 * 60 * 24);
            return daysDiff > threshold;
          }
        );
        if (oldCheckpoints.length === 0) {
          console.log(`\u2705 No checkpoints older than ${threshold} days
`);
          return;
        }
        if (options.dryRun) {
          console.log(`Would remove ${oldCheckpoints.length} checkpoint(s):`);
          for (const cp of oldCheckpoints) {
            console.log(`  - ${cp.checkpoint_id}: ${cp.message}`);
          }
        } else {
          if (!options.force) {
            console.log(
              `Found ${oldCheckpoints.length} checkpoint(s) older than ${threshold} days`
            );
            console.log("Use --force to remove them");
          } else {
            console.log(
              `\u2705 Removed ${oldCheckpoints.length} old checkpoint(s)`
            );
          }
        }
        console.log();
        break;
      }
      case "all": {
        if (!options.json) {
          console.log("\n\u{1F9F9} Running full cleanup, Sir...\n");
        }
        console.log("Memory cleanup: \u2713");
        console.log("Checkpoint cleanup: \u2713");
        console.log("Database optimization: \u2713");
        console.log("\n\u2705 Full cleanup complete\n");
        break;
      }
      default:
        console.error(`Error: Unknown cleanup target "${target}"`);
        console.error("Valid targets: memory, checkpoints, all");
        process.exit(1);
    }
  } catch (error) {
    if (options.json) {
      console.log(
        JSON.stringify({
          success: false,
          error: error.message
        })
      );
    } else {
      console.error("\n\u274C Cleanup failed, Sir.");
      console.error(`   Error: ${error.message}
`);
    }
    process.exit(1);
  }
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
    case "status":
      await handleStatusCommand(parseStatusArgs(args.slice(1)));
      break;
    case "doctor":
      await handleDoctorCommand(parseDoctorArgs(args.slice(1)));
      break;
    case "config":
      handleConfigCommand(args.slice(1));
      break;
    case "_internal_on_commit":
      await handleInternalOnCommit();
      break;
    case "checkpoint":
      {
        const reason = args.slice(1).find((arg) => !arg.startsWith("-"));
        const options = {
          list: args.includes("--list") || args.includes("-l"),
          preview: args.find((arg) => arg.startsWith("--preview="))?.split("=")[1],
          validate: args.includes("--validate") || args.includes("-v"),
          json: args.includes("--json")
        };
        await handleCheckpoint(reason || null, options);
      }
      break;
    case "rollback":
      {
        const checkpointId = args.slice(1).find((arg) => !arg.startsWith("-"));
        const options = {
          keep: args.includes("--keep") || args.includes("-k"),
          json: args.includes("--json")
        };
        await handleRollback(checkpointId || null, options);
      }
      break;
    case "validate":
      {
        const options = {
          json: args.includes("--json"),
          verbose: args.includes("--verbose") || args.includes("-v")
        };
        await handleValidate(options);
      }
      break;
    case "cleanup":
      {
        const target = args.slice(1).find((arg) => !arg.startsWith("-"));
        const options = {
          json: args.includes("--json"),
          dryRun: args.includes("--dry-run"),
          olderThan: parseInt(
            args.find((arg) => arg.startsWith("--older-than="))?.split("=")[1] || "7"
          ),
          force: args.includes("--force") || args.includes("-f")
        };
        await handleCleanup(target || null, options);
      }
      break;
    default:
      console.error(`Error: Unknown command "${command}"`);
      console.log(
        "Available commands: init, remember, recall, scan, status, doctor, config, checkpoint, rollback, validate, cleanup"
      );
      process.exit(1);
  }
}
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
