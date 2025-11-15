"""Project scanner for analyzing tech stack and file structure.

This module provides functionality to scan a project directory and identify:
- Technology stack (languages, frameworks, tools)
- File structure and organization
- Project metadata
"""

from collections.abc import Generator
from pathlib import Path
from typing import Any

# Directories to ignore during scanning
IGNORE_DIRS = {
    ".git",
    ".jarvis",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    "venv",
    ".venv",
    "env",
    ".env",
    "dist",
    "build",
    ".next",
    "target",
    ".idea",
    ".vscode",
}

# File patterns for tech stack detection
TECH_INDICATORS = {
    "Python": ["pyproject.toml", "requirements.txt", "setup.py", "Pipfile"],
    "TypeScript": ["tsconfig.json"],
    "JavaScript": ["package.json"],
    "Go": ["go.mod", "go.sum"],
    "Rust": ["Cargo.toml", "Cargo.lock"],
    "Java": ["pom.xml", "build.gradle", "build.gradle.kts"],
    "C#": [".csproj", ".sln"],
    "Ruby": ["Gemfile", "Rakefile"],
    "PHP": ["composer.json"],
    "Docker": ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"],
    "GitHub Actions": [".github/workflows"],
    "GitLab CI": [".gitlab-ci.yml"],
}


def analyze_tech_stack(project_root: Path) -> dict[str, Any]:
    """Analyze project directory and identify tech stack.

    Args:
        project_root: Path to project root directory

    Returns:
        Dictionary containing:
        - tech_stack: List of identified technologies
        - file_count: Total number of files scanned
        - directory_count: Total number of directories
        - file_types: Dictionary of file extensions and counts
        - project_files: List of important project files found
    """
    tech_stack: set[str] = set()
    project_files: list[str] = []
    file_count = 0
    directory_count = 0
    file_types: dict[str, int] = {}

    if not project_root.exists():
        return {
            "tech_stack": [],
            "file_count": 0,
            "directory_count": 0,
            "file_types": {},
            "project_files": [],
        }

    # Walk through project directory
    for item in _walk_directory(project_root):
        if item.is_file():
            file_count += 1

            # Track file extensions
            suffix = item.suffix.lower()
            if suffix:
                file_types[suffix] = file_types.get(suffix, 0) + 1

            # Check for tech stack indicators
            relative_path = item.relative_to(project_root)
            file_name = item.name

            for tech, indicators in TECH_INDICATORS.items():
                for indicator in indicators:
                    # Check if indicator is a directory path
                    if "/" in indicator:
                        if str(relative_path).startswith(indicator):
                            tech_stack.add(tech)
                            project_files.append(str(relative_path))
                    # Check if indicator matches file name
                    elif file_name == indicator or file_name.endswith(indicator):
                        tech_stack.add(tech)
                        project_files.append(str(relative_path))

        elif item.is_dir():
            directory_count += 1

    # Infer additional technologies from file extensions
    _infer_from_extensions(file_types, tech_stack)

    return {
        "tech_stack": sorted(tech_stack),
        "file_count": file_count,
        "directory_count": directory_count,
        "file_types": dict(sorted(file_types.items())),
        "project_files": sorted(project_files),
    }


def _walk_directory(root: Path) -> Generator[Path, None, None]:
    """Recursively walk directory, skipping ignored directories.

    Args:
        root: Root directory to walk

    Yields:
        Path objects for each file and directory
    """
    try:
        for item in root.iterdir():
            # Skip ignored directories
            if item.is_dir() and item.name in IGNORE_DIRS:
                continue

            yield item

            # Recurse into subdirectories
            if item.is_dir():
                yield from _walk_directory(item)

    except PermissionError:
        # Skip directories we don't have permission to read
        pass


def _infer_from_extensions(file_types: dict[str, int], tech_stack: set[str]) -> None:
    """Infer additional technologies from file extensions.

    Args:
        file_types: Dictionary of file extensions and their counts
        tech_stack: Set to add inferred technologies to (modified in place)
    """
    extension_map = {
        ".py": "Python",
        ".ts": "TypeScript",
        ".tsx": "TypeScript",
        ".js": "JavaScript",
        ".jsx": "JavaScript",
        ".go": "Go",
        ".rs": "Rust",
        ".java": "Java",
        ".kt": "Kotlin",
        ".cs": "C#",
        ".rb": "Ruby",
        ".php": "PHP",
        ".cpp": "C++",
        ".c": "C",
        ".h": "C/C++",
        ".hpp": "C++",
        ".swift": "Swift",
        ".m": "Objective-C",
    }

    for ext, tech in extension_map.items():
        if ext in file_types and file_types[ext] > 0:
            tech_stack.add(tech)


def generate_scan_report(analysis: dict[str, Any]) -> str:
    """Generate human-readable scan report.

    Args:
        analysis: Analysis dictionary from analyze_tech_stack

    Returns:
        Formatted multi-line report string
    """
    tech_stack = analysis.get("tech_stack", [])
    file_count = analysis.get("file_count", 0)
    directory_count = analysis.get("directory_count", 0)
    file_types = analysis.get("file_types", {})

    # Build report
    lines = []

    # Executive summary
    tech_count = len(tech_stack)
    tech_list = ", ".join(tech_stack) if tech_stack else "none"

    lines.append(
        f"✓ Scan complete, Sir. Found {tech_count} "
        f"technolog{'y' if tech_count == 1 else 'ies'} "
        f"({tech_list}) across {file_count} files."
    )

    # Statistics
    lines.append("")
    lines.append("📊 Project Statistics:")
    lines.append(f"  • Total files: {file_count}")
    lines.append(f"  • Total directories: {directory_count}")

    # Tech stack details
    if tech_stack:
        lines.append("")
        lines.append("🔧 Technology Stack:")
        for tech in tech_stack:
            lines.append(f"  • {tech}")

    # File types breakdown (top 10)
    if file_types:
        lines.append("")
        lines.append("📁 File Types (top 10):")
        sorted_types = sorted(file_types.items(), key=lambda x: x[1], reverse=True)[
            :10
        ]
        for ext, count in sorted_types:
            lines.append(f"  • {ext}: {count} files")

    return "\n".join(lines)
