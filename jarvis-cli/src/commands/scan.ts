/**
 * Scan Command - Analyze existing codebase
 * Refactored to use Command Pattern
 */

import { BaseCommand } from "./base/command";
import type { ScanOptions, ScanResult, CodebaseAnalysis } from "./base/types";
import { getDefaultClient } from "../api/mcp-client";
import { MCPConnectionError, InternalError } from "../core/errors";

export class ScanCommand extends BaseCommand<ScanOptions, ScanResult> {
  parse(args: string[]): ScanOptions {
    const options: ScanOptions = {};

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

  validate(_options: ScanOptions): void {
    // Scan command doesn't require validation
    // All options are optional flags
  }

  async execute(options: ScanOptions): Promise<ScanResult> {
    const projectPath = process.cwd();

    try {
      const client = getDefaultClient();
      const response = await client.callTool("analyze_codebase", {
        project_path: projectPath,
        verbose: options.verbose,
        interactive: options.interactive,
      });

      if (!response.success) {
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : (typeof response.error === 'object' && response.error !== null && 'message' in response.error)
            ? String((response.error as { message: unknown }).message)
            : "Analysis failed";
        throw new MCPConnectionError(
          errorMsg,
          "mcp://analyze_codebase"
        );
      }

      const data = response.data as CodebaseAnalysis | undefined;
      return {
        success: true,
        data: data,
        report: typeof response.data === 'object' && response.data !== null && 'report' in response.data 
          ? String(response.data.report) 
          : undefined,
      };
    } catch (error) {
      if (error instanceof MCPConnectionError) {
        throw error;
      }
      throw new InternalError(
        "Failed to analyze codebase",
        { projectPath },
        error instanceof Error ? error : undefined
      );
    }
  }
}

// Legacy export for backward compatibility
export async function handleScanCommand(
  options: ScanOptions = {}
): Promise<void> {
  const command = new ScanCommand();
  
  try {
    if (!options.quiet) {
      console.log("⏳ Analyzing codebase...");
    }

    const result = await command.run([
      ...(options.verbose ? ["--verbose"] : []),
      ...(options.quiet ? ["--quiet"] : []),
      ...(options.json ? ["--json"] : []),
      ...(options.interactive ? ["--interactive"] : []),
    ]);

    displayScanResult(result, options);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    process.exit(1);
  }
}

function displayScanResult(result: ScanResult, options: ScanOptions): void {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const analysis = result.data;

  // If we have a formatted report from scanner, display it
  if (result.report && !options.json) {
    console.log(result.report);
    console.log();
  } else {
    console.log("✓ Codebase analysis complete");
    console.log();
  }

  // In verbose mode or if no report, show detailed breakdown
  if (options.verbose || !result.report) {
    // Tech stack
    if (analysis?.tech_stack && analysis.tech_stack.length > 0) {
      console.log("📚 Tech Stack:");
      analysis.tech_stack.forEach((tech) => console.log(`  • ${tech}`));
      console.log();
    }

    // Dependencies
    if (analysis?.dependencies) {
      const depCount = Object.keys(analysis.dependencies).length;
      if (depCount > 0) {
        console.log(`📦 Dependencies: ${depCount} detected`);
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

    // File structure
    if (analysis?.file_count !== undefined) {
      console.log(`📁 Files: ${analysis.file_count} analyzed`);
      if (analysis.directory_count) {
        console.log(`📂 Directories: ${analysis.directory_count}`);
      }
      console.log();
    }

    // Inconsistencies
    if (analysis?.inconsistencies && analysis.inconsistencies.length > 0) {
      console.log("⚠️  Inconsistencies Detected:");
      analysis.inconsistencies.forEach((issue) => {
        console.log(`   • ${issue.type}: ${issue.description}`);
        if (options.verbose && issue.examples) {
          issue.examples.forEach((ex) => console.log(`     - ${ex}`));
        }
      });
      console.log();
    }

    // Questions
    if (analysis?.questions && analysis.questions.length > 0) {
      console.log("❓ Clarifying Questions:");
      analysis.questions.forEach((q, i) => {
        console.log(`   ${i + 1}. ${q}`);
      });
      console.log();

      if (options.interactive) {
        console.log("💡 Run with --interactive to answer questions");
      }
    }

    // Suggestions
    if (options.verbose && analysis?.suggestions) {
      console.log("💡 Suggestions:");
      analysis.suggestions.forEach((s) => console.log(`  • ${s}`));
      console.log();
    }
  }

  if (!options.quiet) {
    console.log("ℹ️  Project context stored in JARVIS memory");
  }
}

// Keep legacy parseScanArgs for tests
export function parseScanArgs(args: string[]): ScanOptions {
  const command = new ScanCommand();
  return command.parse(args);
}
