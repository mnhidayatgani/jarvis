/**
 * Doctor Command - Health checks for JARVIS system
 * Refactored to use Command Pattern
 */

import { existsSync } from "fs";
import { resolve } from "path";
import { BaseCommand } from "./base/command";
import type { DoctorOptions, DoctorResult, HealthCheckItem } from "./base/types";
import { getDefaultClient } from "../api/mcp-client";
import { NotInitializedError } from "../core/errors";

export class DoctorCommand extends BaseCommand<DoctorOptions, DoctorResult> {
  parse(args: string[]): DoctorOptions {
    const options: DoctorOptions = {};

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

  validate(_options: DoctorOptions): void {
    const jarvisDir = resolve(process.cwd(), ".jarvis");

    if (!existsSync(jarvisDir)) {
      throw new NotInitializedError(process.cwd());
    }
  }

  async execute(options: DoctorOptions): Promise<DoctorResult> {
    const jarvisDir = resolve(process.cwd(), ".jarvis");

    // Try comprehensive health checks from MCP server first
    try {
      const client = getDefaultClient();
      const response = await client.callTool("run_health_checks", {
        project_path: process.cwd(),
      });

      if (response.success && response.data) {
        return this.parseServerHealthData(response.data as any);
      }
    } catch (error) {
      // Fall through to basic checks
      if (options.verbose) {
        console.warn("MCP server unavailable, using basic checks");
      }
    }

    // Fallback to basic filesystem checks
    return this.runBasicChecks(jarvisDir);
  }

  private parseServerHealthData(data: any): DoctorResult {
    const checks: HealthCheckItem[] = [];

    // Convert server response to our format
    if (data.checks) {
      for (const [name, check] of Object.entries(data.checks)) {
        checks.push({
          name: this.formatCheckName(name),
          status: (check as any).status || "warn",
          message: (check as any).message || "",
          details: (check as any).details,
        });
      }
    }

    return {
      success: true,
      overall: data.overall || "healthy",
      passed: data.passed || 0,
      failed: data.failed || 0,
      warnings: data.warnings || 0,
      checks,
    };
  }

  private runBasicChecks(jarvisDir: string): DoctorResult {
    const checks: HealthCheckItem[] = [];

    // Check SQLite database
    const sqlitePath = resolve(jarvisDir, "db", "memory.db");
    checks.push({
      name: "SQLite Database",
      status: existsSync(sqlitePath) ? "pass" : "fail",
      message: existsSync(sqlitePath)
        ? "Database file exists"
        : "Database file missing",
    });

    // Check ChromaDB
    const chromaPath = resolve(jarvisDir, "db", "chroma");
    checks.push({
      name: "ChromaDB",
      status: existsSync(chromaPath) ? "pass" : "warn",
      message: existsSync(chromaPath)
        ? "ChromaDB directory exists"
        : "ChromaDB directory missing",
    });

    // Check Configuration
    const configPath = resolve(jarvisDir, "config.json");
    checks.push({
      name: "Configuration",
      status: existsSync(configPath) ? "pass" : "warn",
      message: existsSync(configPath)
        ? "Config file exists"
        : "Config file missing",
    });

    const passed = checks.filter((c) => c.status === "pass").length;
    const failed = checks.filter((c) => c.status === "fail").length;
    const warnings = checks.filter((c) => c.status === "warn").length;

    return {
      success: true,
      overall: failed > 0 ? "critical" : warnings > 0 ? "degraded" : "healthy",
      passed,
      failed,
      warnings,
      checks,
    };
  }

  private formatCheckName(name: string): string {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}

// Legacy export for backward compatibility
export async function handleDoctorCommand(
  options: DoctorOptions = {}
): Promise<void> {
  const command = new DoctorCommand();

  try {
    if (!options.quiet) {
      console.log("⏳ Running system diagnostics...");
    }

    const result = await command.run([
      ...(options.verbose ? ["--verbose"] : []),
      ...(options.json ? ["--json"] : []),
      ...(options.quiet ? ["--quiet"] : []),
    ]);

    displayDoctorResult(result, options);

    // Exit with appropriate code
    if (result.overall === "healthy") {
      process.exit(0);
    } else if (result.overall === "critical") {
      process.exit(1);
    } else {
      process.exit(0); // degraded but operational
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

function displayDoctorResult(result: DoctorResult, options: DoctorOptions): void {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("\n🏥 JARVIS System Diagnostics\n");

  const statusIcon = result.overall === "healthy" ? "✅" : "⚠️";
  const statusText =
    result.overall === "healthy"
      ? "All systems operational"
      : result.overall === "critical"
      ? "Critical issues detected"
      : "Issues detected";

  console.log(`${statusIcon} Status: ${statusText}`);
  console.log(
    `   ${result.passed} passed, ${result.failed} failed, ${result.warnings} warnings`
  );
  console.log();

  // Display each check
  for (const check of result.checks) {
    displayCheck(check, options.verbose || false);
  }

  console.log();

  if (result.overall === "healthy") {
    console.log("✓ System healthy, Sir.");
  } else if (result.overall === "critical") {
    console.log("✗ System has critical issues");
  } else {
    console.log("⚠️  System has warnings but is operational");
  }
}

function displayCheck(check: HealthCheckItem, verbose: boolean): void {
  const icon = getStatusIcon(check.status);
  console.log(`${icon} ${check.name}`);

  if (check.message) {
    console.log(`   ${check.message}`);
  }

  if (verbose && check.details) {
    displayDetails(check.details, "   ");
  }

  console.log();
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "pass":
      return "✅";
    case "warn":
      return "⚠️";
    case "fail":
      return "❌";
    default:
      return "❓";
  }
}

function displayDetails(details: unknown, indent: string = ""): void {
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

  if (typeof details === "object" && details !== null) {
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

// Keep legacy parseDoctorArgs for tests
export function parseDoctorArgs(args: string[]): DoctorOptions {
  const command = new DoctorCommand();
  return command.parse(args);
}
