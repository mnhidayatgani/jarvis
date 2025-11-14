"""Git Hooks Management for JARVIS Auto-Capture.

Handles installation and management of git hooks for automatic code change tracking.
"""

import stat
from pathlib import Path
from typing import Any


class GitHooks:
    """Manages git hooks for automatic code change capture."""

    def __init__(self, project_root: Path) -> None:
        """Initialize GitHooks manager.

        Args:
            project_root: Path to project root directory.
        """
        self.project_root = project_root
        self.git_dir = project_root / ".git"
        self.hooks_dir = self.git_dir / "hooks"

    def is_git_repository(self) -> bool:
        """Check if project is a git repository.

        Returns:
            True if git repository, False otherwise.
        """
        return self.git_dir.exists() and self.git_dir.is_dir()

    def install_hooks(self, force: bool = False) -> dict[str, Any]:
        """Install JARVIS git hooks.

        Args:
            force: If True, overwrite existing hooks without asking.

        Returns:
            Installation status report.
        """
        if not self.is_git_repository():
            return {
                "success": False,
                "error": "Not a git repository",
                "message": "Cannot install hooks: .git directory not found",
            }

        # Ensure hooks directory exists
        self.hooks_dir.mkdir(parents=True, exist_ok=True)

        installed = []
        skipped = []
        errors = []

        # Install pre-commit hook
        pre_commit_result = self._install_hook("pre-commit", force)
        if pre_commit_result["installed"]:
            installed.append("pre-commit")
        elif pre_commit_result.get("skipped"):
            skipped.append("pre-commit")
        elif pre_commit_result.get("error"):
            errors.append(f"pre-commit: {pre_commit_result['error']}")

        # Install post-commit hook
        post_commit_result = self._install_hook("post-commit", force)
        if post_commit_result["installed"]:
            installed.append("post-commit")
        elif post_commit_result.get("skipped"):
            skipped.append("post-commit")
        elif post_commit_result.get("error"):
            errors.append(f"post-commit: {post_commit_result['error']}")

        return {
            "success": len(errors) == 0,
            "installed": installed,
            "skipped": skipped,
            "errors": errors,
            "message": self._format_install_message(installed, skipped, errors),
        }

    def uninstall_hooks(self) -> dict[str, Any]:
        """Uninstall JARVIS git hooks.

        Returns:
            Uninstallation status report.
        """
        if not self.is_git_repository():
            return {
                "success": False,
                "error": "Not a git repository",
            }

        removed = []
        errors = []

        for hook_name in ["pre-commit", "post-commit"]:
            hook_path = self.hooks_dir / hook_name
            if hook_path.exists():
                try:
                    # Check if it's our hook
                    content = hook_path.read_text()
                    if "JARVIS" in content:
                        hook_path.unlink()
                        removed.append(hook_name)
                except OSError as e:
                    errors.append(f"{hook_name}: {str(e)}")

        return {
            "success": len(errors) == 0,
            "removed": removed,
            "errors": errors,
            "message": (
                f"Removed {len(removed)} hook(s)"
                if removed
                else "No JARVIS hooks found"
            ),
        }

    def _install_hook(self, hook_name: str, force: bool) -> dict[str, Any]:
        """Install a specific git hook.

        Args:
            hook_name: Name of the hook (e.g., 'pre-commit').
            force: Overwrite existing hooks.

        Returns:
            Installation result.
        """
        hook_path = self.hooks_dir / hook_name
        template_content = self._get_hook_template(hook_name)

        # Check if hook already exists
        if hook_path.exists() and not force:
            existing_content = hook_path.read_text()
            if "JARVIS" in existing_content:
                return {"installed": False, "skipped": True, "exists": True}
            else:
                return {
                    "installed": False,
                    "skipped": True,
                    "error": "Existing non-JARVIS hook found. Use --force to overwrite.",
                }

        try:
            # Write hook script
            hook_path.write_text(template_content)

            # Make executable
            current_permissions = hook_path.stat().st_mode
            hook_path.chmod(current_permissions | stat.S_IXUSR | stat.S_IXGRP)

            return {"installed": True}
        except OSError as e:
            return {"installed": False, "error": str(e)}

    def _get_hook_template(self, hook_name: str) -> str:
        """Get hook script template.

        Args:
            hook_name: Name of the hook.

        Returns:
            Hook script content.
        """
        if hook_name == "pre-commit":
            return self._get_pre_commit_template()
        elif hook_name == "post-commit":
            return self._get_post_commit_template()
        else:
            return ""

    def _get_pre_commit_template(self) -> str:
        """Get pre-commit hook template."""
        return """#!/bin/bash
# JARVIS Pre-Commit Hook
# Captures staged changes before commit

# Get project root (parent of .git)
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
JARVIS_DIR="$PROJECT_ROOT/.jarvis"

# Skip if JARVIS not initialized
if [ ! -d "$JARVIS_DIR" ]; then
    exit 0
fi

# Capture staged changes
git diff --cached --name-status > "$JARVIS_DIR/.staged_changes"
git diff --cached > "$JARVIS_DIR/.staged_diff"

exit 0
"""

    def _get_post_commit_template(self) -> str:
        """Get post-commit hook template."""
        return """#!/bin/bash
# JARVIS Post-Commit Hook
# Updates commit information after successful commit

# Get project root and commit info
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
JARVIS_DIR="$PROJECT_ROOT/.jarvis"
COMMIT_SHA="$(git rev-parse HEAD)"
COMMIT_MSG="$(git log -1 --pretty=%B)"

# Skip if JARVIS not initialized
if [ ! -d "$JARVIS_DIR" ]; then
    exit 0
fi

# Store commit metadata
echo "$COMMIT_SHA" > "$JARVIS_DIR/.last_commit_sha"
echo "$COMMIT_MSG" > "$JARVIS_DIR/.last_commit_msg"

# Clean up staged change files
rm -f "$JARVIS_DIR/.staged_changes"
rm -f "$JARVIS_DIR/.staged_diff"

exit 0
"""

    def _format_install_message(
        self, installed: list[str], skipped: list[str], errors: list[str]
    ) -> str:
        """Format installation message.

        Args:
            installed: List of installed hooks.
            skipped: List of skipped hooks.
            errors: List of errors.

        Returns:
            Formatted message.
        """
        parts = []

        if installed:
            parts.append(f"Installed: {', '.join(installed)}")

        if skipped:
            parts.append(f"Skipped: {', '.join(skipped)}")

        if errors:
            parts.append(f"Errors: {'; '.join(errors)}")

        if not parts:
            return "No hooks installed"

        return " | ".join(parts)


def install_git_hooks(project_root: Path, force: bool = False) -> dict[str, Any]:
    """Convenience function to install git hooks.

    Args:
        project_root: Path to project root.
        force: Overwrite existing hooks.

    Returns:
        Installation status.
    """
    hooks = GitHooks(project_root)
    return hooks.install_hooks(force)


def uninstall_git_hooks(project_root: Path) -> dict[str, Any]:
    """Convenience function to uninstall git hooks.

    Args:
        project_root: Path to project root.

    Returns:
        Uninstallation status.
    """
    hooks = GitHooks(project_root)
    return hooks.uninstall_hooks()
