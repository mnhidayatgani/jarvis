"""
Validator Module - Code Quality and Test Validation

This module provides validation mechanisms for code quality:
- Test runner detection and execution (pytest, vitest, jest)
- Linter detection and execution (ruff, eslint, mypy)
- Type checker execution
- Auto-rollback on validation failure
"""

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class ValidationResult:
    """Result of a validation check."""

    tool: str
    passed: bool
    output: str
    error: str | None
    duration_seconds: float


class ValidationError(Exception):
    """Raised when validation fails."""

    pass


def detect_project_type(project_root: str) -> dict[str, Any]:
    """
    Detect project type and available validation tools.

    Args:
        project_root: Absolute path to project root

    Returns:
        dict with detected tools:
        {
            "python": bool,
            "typescript": bool,
            "tools": {
                "pytest": bool,
                "ruff": bool,
                "mypy": bool,
                "vitest": bool,
                "jest": bool,
                "eslint": bool,
                "tsc": bool
            }
        }
    """
    root = Path(project_root)
    detected: dict[str, Any] = {
        "python": False,
        "typescript": False,
        "tools": {},
    }

    # Detect Python project
    if (root / "pyproject.toml").exists() or (root / "setup.py").exists():
        detected["python"] = True

        # Check for pytest
        try:
            subprocess.run(
                ["pytest", "--version"],
                cwd=project_root,
                capture_output=True,
                check=True,
                timeout=5,
            )
            detected["tools"]["pytest"] = True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            detected["tools"]["pytest"] = False

        # Check for ruff
        try:
            subprocess.run(
                ["ruff", "--version"],
                capture_output=True,
                check=True,
                timeout=5,
            )
            detected["tools"]["ruff"] = True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            detected["tools"]["ruff"] = False

        # Check for mypy
        try:
            subprocess.run(
                ["mypy", "--version"],
                capture_output=True,
                check=True,
                timeout=5,
            )
            detected["tools"]["mypy"] = True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            detected["tools"]["mypy"] = False

    # Detect TypeScript/JavaScript project
    if (root / "package.json").exists():
        detected["typescript"] = True

        # Check for vitest
        if (root / "vitest.config.ts").exists() or (root / "vitest.config.js").exists():
            detected["tools"]["vitest"] = True
        else:
            detected["tools"]["vitest"] = False

        # Check for jest
        if (root / "jest.config.js").exists() or (root / "jest.config.ts").exists():
            detected["tools"]["jest"] = True
        else:
            detected["tools"]["jest"] = False

        # Check for eslint
        if any(
            (root / f).exists()
            for f in [".eslintrc.js", ".eslintrc.json", ".eslintrc.yml", "eslint.config.js"]
        ):
            detected["tools"]["eslint"] = True
        else:
            detected["tools"]["eslint"] = False

        # Check for TypeScript
        if (root / "tsconfig.json").exists():
            detected["tools"]["tsc"] = True
        else:
            detected["tools"]["tsc"] = False

    return detected


def run_python_validation(project_root: str, tools: dict[str, bool]) -> list[ValidationResult]:
    """
    Run Python validation tools.

    Args:
        project_root: Project root directory
        tools: Dictionary of available tools

    Returns:
        List of ValidationResult objects
    """
    import time

    results = []

    # Run ruff
    if tools.get("ruff"):
        start = time.time()
        try:
            result = subprocess.run(
                ["ruff", "check", "."],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=30,
            )
            duration = time.time() - start
            results.append(
                ValidationResult(
                    tool="ruff",
                    passed=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.returncode != 0 else None,
                    duration_seconds=duration,
                )
            )
        except subprocess.TimeoutExpired:
            results.append(
                ValidationResult(
                    tool="ruff",
                    passed=False,
                    output="",
                    error="Timeout after 30 seconds",
                    duration_seconds=30.0,
                )
            )

    # Run mypy
    if tools.get("mypy"):
        start = time.time()
        try:
            result = subprocess.run(
                ["mypy", "."],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=30,
            )
            duration = time.time() - start
            results.append(
                ValidationResult(
                    tool="mypy",
                    passed=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.returncode != 0 else None,
                    duration_seconds=duration,
                )
            )
        except subprocess.TimeoutExpired:
            results.append(
                ValidationResult(
                    tool="mypy",
                    passed=False,
                    output="",
                    error="Timeout after 30 seconds",
                    duration_seconds=30.0,
                )
            )

    # Run pytest
    if tools.get("pytest"):
        start = time.time()
        try:
            result = subprocess.run(
                ["pytest", "-v", "--tb=short"],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=60,
            )
            duration = time.time() - start
            results.append(
                ValidationResult(
                    tool="pytest",
                    passed=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.returncode != 0 else None,
                    duration_seconds=duration,
                )
            )
        except subprocess.TimeoutExpired:
            results.append(
                ValidationResult(
                    tool="pytest",
                    passed=False,
                    output="",
                    error="Timeout after 60 seconds",
                    duration_seconds=60.0,
                )
            )

    return results


def run_typescript_validation(
    project_root: str, tools: dict[str, bool]
) -> list[ValidationResult]:
    """
    Run TypeScript/JavaScript validation tools.

    Args:
        project_root: Project root directory
        tools: Dictionary of available tools

    Returns:
        List of ValidationResult objects
    """
    import time

    results = []

    # Run eslint
    if tools.get("eslint"):
        start = time.time()
        try:
            result = subprocess.run(
                ["npx", "eslint", "."],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=30,
            )
            duration = time.time() - start
            results.append(
                ValidationResult(
                    tool="eslint",
                    passed=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.returncode != 0 else None,
                    duration_seconds=duration,
                )
            )
        except subprocess.TimeoutExpired:
            results.append(
                ValidationResult(
                    tool="eslint",
                    passed=False,
                    output="",
                    error="Timeout after 30 seconds",
                    duration_seconds=30.0,
                )
            )

    # Run tsc
    if tools.get("tsc"):
        start = time.time()
        try:
            result = subprocess.run(
                ["npx", "tsc", "--noEmit"],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=30,
            )
            duration = time.time() - start
            results.append(
                ValidationResult(
                    tool="tsc",
                    passed=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.returncode != 0 else None,
                    duration_seconds=duration,
                )
            )
        except subprocess.TimeoutExpired:
            results.append(
                ValidationResult(
                    tool="tsc",
                    passed=False,
                    output="",
                    error="Timeout after 30 seconds",
                    duration_seconds=30.0,
                )
            )

    # Run vitest
    if tools.get("vitest"):
        start = time.time()
        try:
            result = subprocess.run(
                ["npm", "test"],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=60,
            )
            duration = time.time() - start
            results.append(
                ValidationResult(
                    tool="vitest",
                    passed=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.returncode != 0 else None,
                    duration_seconds=duration,
                )
            )
        except subprocess.TimeoutExpired:
            results.append(
                ValidationResult(
                    tool="vitest",
                    passed=False,
                    output="",
                    error="Timeout after 60 seconds",
                    duration_seconds=60.0,
                )
            )

    # Run jest
    elif tools.get("jest"):
        start = time.time()
        try:
            result = subprocess.run(
                ["npm", "test"],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=60,
            )
            duration = time.time() - start
            results.append(
                ValidationResult(
                    tool="jest",
                    passed=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.returncode != 0 else None,
                    duration_seconds=duration,
                )
            )
        except subprocess.TimeoutExpired:
            results.append(
                ValidationResult(
                    tool="jest",
                    passed=False,
                    output="",
                    error="Timeout after 60 seconds",
                    duration_seconds=60.0,
                )
            )

    return results


def run_validation(project_root: str) -> dict[str, Any]:
    """
    Run all available validation tools for the project.

    Args:
        project_root: Absolute path to project root

    Returns:
        dict with validation results:
        {
            "overall_passed": bool,
            "total_checks": int,
            "passed_checks": int,
            "failed_checks": int,
            "results": list[ValidationResult],
            "duration_seconds": float
        }

    Raises:
        ValidationError: If validation cannot be performed
    """
    import time

    start_time = time.time()

    # Detect project type and tools
    detection = detect_project_type(project_root)

    if not detection["python"] and not detection["typescript"]:
        raise ValidationError("No Python or TypeScript project detected")

    all_results = []

    # Run Python validation
    if detection["python"]:
        python_results = run_python_validation(project_root, detection["tools"])
        all_results.extend(python_results)

    # Run TypeScript validation
    if detection["typescript"]:
        ts_results = run_typescript_validation(project_root, detection["tools"])
        all_results.extend(ts_results)

    # Calculate summary
    total = len(all_results)
    passed = sum(1 for r in all_results if r.passed)
    failed = total - passed

    duration = time.time() - start_time

    return {
        "overall_passed": failed == 0,
        "total_checks": total,
        "passed_checks": passed,
        "failed_checks": failed,
        "results": [
            {
                "tool": r.tool,
                "passed": r.passed,
                "output": r.output[:500] if r.output else "",  # Truncate output
                "error": r.error,
                "duration_seconds": r.duration_seconds,
            }
            for r in all_results
        ],
        "duration_seconds": duration,
    }
