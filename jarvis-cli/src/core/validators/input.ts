/**
 * Type guards for runtime validation of command inputs
 * 
 * Provides type-safe runtime validation for command options and arguments.
 */

import type {
  InitOptions,
  StatusOptions,
  ConfigOptions,
  ScanOptions,
  RememberOptions,
  RecallOptions,
  DoctorOptions,
  CheckpointOptions,
  RollbackOptions,
  ValidateOptions,
  CleanupOptions,
} from "../../commands/base/types";

/**
 * Type guard to check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Type guard to check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type guard to check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if value is an array of strings
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Type guard to check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/**
 * Type guard to check if value is a valid memory type
 */
export function isMemoryType(value: unknown): value is "decision" | "note" | "context" {
  return value === "decision" || value === "note" || value === "context";
}

/**
 * Type guard to check if value is a valid cleanup target
 */
export function isCleanupTarget(value: unknown): value is "memory" | "checkpoints" | "all" {
  return value === "memory" || value === "checkpoints" || value === "all";
}

/**
 * Type guard to check if value is a valid ISO 8601 date string
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }
  // Basic ISO 8601 format check (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoDateRegex.test(value) && !isNaN(Date.parse(value));
}

/**
 * Type guard to check if value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value > 0;
}

/**
 * Type guard to check if value is within a range
 */
export function isInRange(
  value: unknown,
  min: number,
  max: number
): value is number {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Type guard to check if value is a valid file path string
 */
export function isValidFilePath(value: unknown): value is string {
  if (!isString(value)) {
    return false;
  }
  // Basic validation: not empty, doesn't contain null bytes
  return value.length > 0 && !value.includes("\0");
}

/**
 * Type guard to check if value is InitOptions
 */
export function isInitOptions(value: unknown): value is InitOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.force === undefined || isBoolean(obj.force)) &&
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json))
  );
}

/**
 * Type guard to check if value is StatusOptions
 */
export function isStatusOptions(value: unknown): value is StatusOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.json === undefined || isBoolean(obj.json)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet))
  );
}

/**
 * Type guard to check if value is ConfigOptions
 */
export function isConfigOptions(value: unknown): value is ConfigOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.key === undefined || isString(obj.key)) &&
    (obj.value === undefined || isString(obj.value)) &&
    (obj.list === undefined || isBoolean(obj.list)) &&
    (obj.unset === undefined || isBoolean(obj.unset)) &&
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json))
  );
}

/**
 * Type guard to check if value is ScanOptions
 */
export function isScanOptions(value: unknown): value is ScanOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json)) &&
    (obj.interactive === undefined || isBoolean(obj.interactive))
  );
}

/**
 * Type guard to check if value is RememberOptions
 */
export function isRememberOptions(value: unknown): value is RememberOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.content === undefined || isString(obj.content)) &&
    (obj.type === undefined || isMemoryType(obj.type)) &&
    (obj.tags === undefined || isStringArray(obj.tags)) &&
    (obj.file === undefined || isValidFilePath(obj.file)) &&
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json))
  );
}

/**
 * Type guard to check if value is RecallOptions
 */
export function isRecallOptions(value: unknown): value is RecallOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.query === undefined || isString(obj.query)) &&
    (obj.type === undefined || isMemoryType(obj.type)) &&
    (obj.file === undefined || isValidFilePath(obj.file)) &&
    (obj.since === undefined || isISODateString(obj.since)) &&
    (obj.limit === undefined || isPositiveInteger(obj.limit)) &&
    (obj.id === undefined || isString(obj.id)) &&
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json))
  );
}

/**
 * Type guard to check if value is DoctorOptions
 */
export function isDoctorOptions(value: unknown): value is DoctorOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.json === undefined || isBoolean(obj.json)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet))
  );
}

/**
 * Type guard to check if value is CheckpointOptions
 */
export function isCheckpointOptions(value: unknown): value is CheckpointOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.reason === undefined || isString(obj.reason)) &&
    (obj.list === undefined || isBoolean(obj.list)) &&
    (obj.preview === undefined || isString(obj.preview)) &&
    (obj.validate === undefined || isBoolean(obj.validate)) &&
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json))
  );
}

/**
 * Type guard to check if value is RollbackOptions
 */
export function isRollbackOptions(value: unknown): value is RollbackOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.checkpointId === undefined || isString(obj.checkpointId)) &&
    (obj.keep === undefined || isBoolean(obj.keep)) &&
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json))
  );
}

/**
 * Type guard to check if value is ValidateOptions
 */
export function isValidateOptions(value: unknown): value is ValidateOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json))
  );
}

/**
 * Type guard to check if value is CleanupOptions
 */
export function isCleanupOptions(value: unknown): value is CleanupOptions {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    (obj.target === undefined || isCleanupTarget(obj.target)) &&
    (obj.dryRun === undefined || isBoolean(obj.dryRun)) &&
    (obj.olderThan === undefined || isPositiveInteger(obj.olderThan)) &&
    (obj.force === undefined || isBoolean(obj.force)) &&
    (obj.verbose === undefined || isBoolean(obj.verbose)) &&
    (obj.quiet === undefined || isBoolean(obj.quiet)) &&
    (obj.json === undefined || isBoolean(obj.json))
  );
}

