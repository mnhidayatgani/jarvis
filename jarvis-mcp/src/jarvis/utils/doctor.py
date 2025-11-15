"""System health checks for JARVIS.

Validates dependencies, database health, and system configuration.
"""

import shutil
import subprocess
import sys
from pathlib import Path


def run_health_checks(project_path: str) -> dict:
    """Run comprehensive system health checks.

    Args:
        project_path: Path to project root

    Returns:
        Dictionary with health check results
    """
    checks = {
        "python_version": check_python_version(),
        "dependencies": check_dependencies(),
        "databases": check_databases(project_path),
        "disk_space": check_disk_space(project_path),
        "permissions": check_permissions(project_path),
        "git": check_git_repository(project_path),
    }

    # Overall health status
    all_passed = all(
        check.get("status") == "pass" for check in checks.values() if "status" in check
    )

    return {
        "overall": "healthy" if all_passed else "issues_found",
        "checks": checks,
        "passed": sum(
            1 for check in checks.values() if check.get("status") == "pass"
        ),
        "failed": sum(
            1 for check in checks.values() if check.get("status") == "fail"
        ),
        "warnings": sum(
            1 for check in checks.values() if check.get("status") == "warning"
        ),
    }


def check_python_version() -> dict:
    """Check if Python version meets requirements.

    Returns:
        Check result with status and details
    """
    version_info = sys.version_info
    current_version = f"{version_info.major}.{version_info.minor}.{version_info.micro}"

    # Require Python 3.9+
    if version_info.major >= 3 and version_info.minor >= 9:
        return {
            "status": "pass",
            "message": f"Python {current_version}",
            "details": "Version requirement met (3.9+)",
        }
    else:
        return {
            "status": "fail",
            "message": f"Python {current_version}",
            "details": "Python 3.9+ required",
        }


def check_dependencies() -> dict:
    """Check if required Python packages are installed.

    Returns:
        Check result with installed packages
    """
    required = [
        "sqlalchemy",
        "chromadb",
        "sentence_transformers",
    ]

    installed = []
    missing = []

    for package in required:
        try:
            __import__(package)
            installed.append(package)
        except ImportError:
            missing.append(package)

    if not missing:
        return {
            "status": "pass",
            "message": f"All {len(installed)} dependencies installed",
            "details": {"installed": installed},
        }
    else:
        return {
            "status": "fail",
            "message": f"{len(missing)} dependencies missing",
            "details": {"installed": installed, "missing": missing},
        }


def check_databases(project_path: str) -> dict:
    """Check database health and accessibility.

    Args:
        project_path: Path to project root

    Returns:
        Check result with database status
    """
    jarvis_path = Path(project_path) / ".jarvis"

    if not jarvis_path.exists():
        return {
            "status": "fail",
            "message": "JARVIS not initialized",
            "details": "Run 'jarvis init' first",
        }

    db_path = jarvis_path / "db"
    sqlite_db = db_path / "memory.db"
    chroma_db = db_path / "chroma"

    issues = []
    databases = {}

    # Check SQLite
    if sqlite_db.exists():
        try:
            # Try to open and query
            from sqlalchemy import create_engine

            engine = create_engine(f"sqlite:///{sqlite_db}")
            with engine.connect() as conn:
                conn.execute("SELECT 1")  # type: ignore[arg-type]
            databases["sqlite"] = "accessible"
        except Exception as e:
            databases["sqlite"] = f"error: {str(e)}"
            issues.append(f"SQLite: {str(e)}")
    else:
        databases["sqlite"] = "not_found"
        issues.append("SQLite database not found")

    # Check ChromaDB
    if chroma_db.exists():
        try:
            import chromadb

            client = chromadb.PersistentClient(path=str(chroma_db))
            client.heartbeat()  # type: ignore[attr-defined]
            databases["chromadb"] = "accessible"
        except Exception as e:
            databases["chromadb"] = f"error: {str(e)}"
            issues.append(f"ChromaDB: {str(e)}")
    else:
        databases["chromadb"] = "not_found"
        issues.append("ChromaDB directory not found")

    if not issues:
        return {
            "status": "pass",
            "message": "All databases accessible",
            "details": databases,
        }
    else:
        return {
            "status": "fail" if len(issues) >= 2 else "warning",
            "message": f"{len(issues)} database issue(s)",
            "details": {"databases": databases, "issues": issues},
        }


def check_disk_space(project_path: str) -> dict:
    """Check available disk space.

    Args:
        project_path: Path to project root

    Returns:
        Check result with disk space info
    """
    try:
        stat = shutil.disk_usage(project_path)
        free_gb = stat.free / (1024**3)
        total_gb = stat.total / (1024**3)
        used_percent = (stat.used / stat.total) * 100

        # Warn if less than 1GB free or >95% used
        if free_gb < 1.0 or used_percent > 95:
            status = "warning"
            message = f"Low disk space: {free_gb:.1f}GB free"
        else:
            status = "pass"
            message = f"{free_gb:.1f}GB free of {total_gb:.1f}GB"

        return {
            "status": status,
            "message": message,
            "details": {
                "free_gb": round(free_gb, 2),
                "total_gb": round(total_gb, 2),
                "used_percent": round(used_percent, 1),
            },
        }
    except Exception as e:
        return {
            "status": "warning",
            "message": "Could not check disk space",
            "details": str(e),
        }


def check_permissions(project_path: str) -> dict:
    """Check if .jarvis directory has proper permissions.

    Args:
        project_path: Path to project root

    Returns:
        Check result with permission status
    """
    jarvis_path = Path(project_path) / ".jarvis"

    if not jarvis_path.exists():
        return {
            "status": "warning",
            "message": ".jarvis directory not found",
            "details": "Not initialized",
        }

    issues = []

    # Check if readable
    if not jarvis_path.is_dir():
        issues.append(".jarvis is not a directory")
    elif not jarvis_path.stat().st_mode & 0o400:  # Owner read permission
        issues.append("Directory not readable")

    # Check if writable
    if jarvis_path.exists() and not jarvis_path.stat().st_mode & 0o200:
        issues.append("Directory not writable")

    if not issues:
        return {
            "status": "pass",
            "message": "Permissions OK",
            "details": "Read/write access verified",
        }
    else:
        return {
            "status": "fail",
            "message": "Permission issues detected",
            "details": issues,
        }


def check_git_repository(project_path: str) -> dict:
    """Check if project is a git repository.

    Args:
        project_path: Path to project root

    Returns:
        Check result with git status
    """
    git_dir = Path(project_path) / ".git"

    if not git_dir.exists():
        return {
            "status": "warning",
            "message": "Not a git repository",
            "details": "Auto-capture features will be limited",
        }

    try:
        # Check if git is available
        result = subprocess.run(
            ["git", "--version"],
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=5,
        )

        if result.returncode == 0:
            git_version = result.stdout.strip()

            # Try to get branch name
            branch_result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=5,
            )

            branch = (
                branch_result.stdout.strip()
                if branch_result.returncode == 0
                else "unknown"
            )

            return {
                "status": "pass",
                "message": "Git repository active",
                "details": {"version": git_version, "branch": branch},
            }
        else:
            return {
                "status": "warning",
                "message": "Git command failed",
                "details": result.stderr.strip(),
            }

    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        return {
            "status": "warning",
            "message": "Could not check git",
            "details": str(e),
        }
