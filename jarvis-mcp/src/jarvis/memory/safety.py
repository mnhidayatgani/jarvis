"""
Safety Module - Checkpoint and Rollback System

This module provides safety mechanisms for JARVIS:
- Create checkpoints before risky changes (git stash)
- Rollback to previous states
- Atomic rollback (all or nothing)
- Checkpoint metadata storage
"""

import subprocess
from datetime import datetime
from typing import Any

from .factual import FactualMemory


class SafetyError(Exception):
    """Raised when safety operations fail"""

    pass


def create_checkpoint(
    project_root: str,
    reason: str,
    project_id: str,
    factual_memory: FactualMemory | None = None,
) -> dict[str, Any]:
    """
    Create a safety checkpoint using git stash.

    Args:
        project_root: Absolute path to project root
        reason: Human-readable reason for checkpoint
        project_id: Project identifier
        factual_memory: FactualMemory instance for metadata storage

    Returns:
        dict with checkpoint information:
        {
            "checkpoint_id": str,  # stash reference
            "reason": str,
            "timestamp": str,
            "files_affected": list[str],
            "has_changes": bool
        }

    Raises:
        SafetyError: If checkpoint creation fails
    """
    try:
        # Check if we're in a git repository
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            raise SafetyError("Not a git repository")

        # Check if there are any changes to stash
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        has_changes = bool(status_result.stdout.strip())

        if not has_changes:
            # No changes to stash - return empty checkpoint
            return {
                "checkpoint_id": None,
                "reason": reason,
                "timestamp": datetime.now().isoformat(),
                "files_affected": [],
                "has_changes": False,
            }

        # Get list of changed files
        files_changed = []
        for line in status_result.stdout.strip().split("\n"):
            if line:
                # Format: "XY filename" - extract filename
                parts = line.strip().split(maxsplit=1)
                if len(parts) == 2:
                    files_changed.append(parts[1])

        # Create git stash with message
        timestamp = datetime.now().isoformat()
        stash_message = f"JARVIS checkpoint: {reason} ({timestamp})"

        subprocess.run(
            ["git", "stash", "push", "-u", "-m", stash_message],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        # Get the stash reference (stash@{0})
        stash_list_result = subprocess.run(
            ["git", "stash", "list"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        # Parse stash reference from first line
        stash_ref = None
        if stash_list_result.stdout:
            first_line = stash_list_result.stdout.split("\n")[0]
            # Format: "stash@{0}: On branch: message"
            if ":" in first_line:
                stash_ref = first_line.split(":")[0].strip()

        checkpoint_data = {
            "checkpoint_id": stash_ref,
            "reason": reason,
            "timestamp": timestamp,
            "files_affected": files_changed,
            "has_changes": True,
        }

        # Store checkpoint metadata in factual memory if provided
        if factual_memory and stash_ref:
            metadata_dict = {
                "type": "checkpoint",
                "stash_ref": stash_ref,
                "reason": reason,
                "files_affected": files_changed,
                "project_root": project_root,
            }

            factual_memory.create_entry(
                project_id=project_root,
                content=f"Checkpoint created: {reason}",
                content_type="checkpoint",
                metadata=metadata_dict,
            )

        return checkpoint_data

    except subprocess.CalledProcessError as e:
        raise SafetyError(f"Git command failed: {e.stderr}") from e
    except Exception as e:
        raise SafetyError(f"Failed to create checkpoint: {str(e)}") from e


def list_checkpoints(project_root: str) -> list[dict[str, Any]]:
    """
    List all available checkpoints (git stashes).

    Args:
        project_root: Absolute path to project root

    Returns:
        List of checkpoint dictionaries with:
        {
            "checkpoint_id": str,  # stash@{N}
            "message": str,
            "timestamp": str,
            "index": int
        }

    Raises:
        SafetyError: If listing fails
    """
    try:
        # Check if we're in a git repository
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            raise SafetyError("Not a git repository")

        # Get stash list
        stash_result = subprocess.run(
            ["git", "stash", "list", "--format=%gd|%s|%ai"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        checkpoints = []
        for index, line in enumerate(stash_result.stdout.strip().split("\n")):
            if not line:
                continue

            parts = line.split("|", 2)
            if len(parts) == 3:
                checkpoint_id, message, timestamp = parts
                checkpoints.append(
                    {
                        "checkpoint_id": checkpoint_id,
                        "message": message,
                        "timestamp": timestamp,
                        "index": index,
                    }
                )

        return checkpoints

    except subprocess.CalledProcessError as e:
        raise SafetyError(f"Failed to list checkpoints: {e.stderr}") from e
    except Exception as e:
        raise SafetyError(f"Failed to list checkpoints: {str(e)}") from e


def rollback_to_checkpoint(
    project_root: str,
    checkpoint_id: str | None = None,
    keep_checkpoint: bool = False,
) -> dict[str, Any]:
    """
    Rollback to a previous checkpoint.

    Args:
        project_root: Absolute path to project root
        checkpoint_id: Stash reference (e.g., "stash@{0}"). If None, uses latest.
        keep_checkpoint: If True, keep the stash after applying (git stash apply).
                        If False, remove it (git stash pop).

    Returns:
        dict with rollback information:
        {
            "success": bool,
            "checkpoint_id": str,
            "files_restored": list[str],
            "timestamp": str
        }

    Raises:
        SafetyError: If rollback fails
    """
    try:
        # Check if we're in a git repository
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            raise SafetyError("Not a git repository")

        # Check if there are any stashes
        stash_list = subprocess.run(
            ["git", "stash", "list"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        if not stash_list.stdout.strip():
            raise SafetyError("No checkpoints available")

        # Determine which stash to apply
        stash_ref = checkpoint_id if checkpoint_id else "stash@{0}"

        # Check for uncommitted changes that might conflict
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        if status_result.stdout.strip():
            # Create a temporary checkpoint for current changes
            create_checkpoint(
                project_root,
                "Auto-save before rollback",
                "",  # No project_id for temp checkpoint
                None,  # Don't save to factual memory
            )

        # Apply or pop the stash (atomic operation)
        command = ["git", "stash", "pop" if not keep_checkpoint else "apply", stash_ref]

        rollback_result = subprocess.run(
            command,
            cwd=project_root,
            capture_output=True,
            text=True,
            check=False,
        )

        if rollback_result.returncode != 0:
            raise SafetyError(
                f"Rollback failed. Changes may be in conflict. Error: {rollback_result.stderr}"
            )

        # Get list of files that were restored
        diff_result = subprocess.run(
            ["git", "diff", "--name-only"],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        files_restored = [
            f for f in diff_result.stdout.strip().split("\n") if f
        ]

        return {
            "success": True,
            "checkpoint_id": stash_ref,
            "files_restored": files_restored,
            "timestamp": datetime.now().isoformat(),
        }

    except subprocess.CalledProcessError as e:
        raise SafetyError(f"Git command failed: {e.stderr}") from e
    except SafetyError:
        raise
    except Exception as e:
        raise SafetyError(f"Failed to rollback: {str(e)}") from e


def preview_checkpoint(
    project_root: str, checkpoint_id: str | None = None
) -> dict[str, Any]:
    """
    Preview what would change if a checkpoint were applied.

    Args:
        project_root: Absolute path to project root
        checkpoint_id: Stash reference. If None, uses latest.

    Returns:
        dict with preview information:
        {
            "checkpoint_id": str,
            "files_changed": list[str],
            "diff": str,
            "stats": dict
        }

    Raises:
        SafetyError: If preview fails
    """
    try:
        stash_ref = checkpoint_id if checkpoint_id else "stash@{0}"

        # Get diff statistics
        stat_result = subprocess.run(
            ["git", "stash", "show", "--stat", stash_ref],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        # Get list of changed files
        files_result = subprocess.run(
            ["git", "stash", "show", "--name-only", stash_ref],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        files_changed = [
            f for f in files_result.stdout.strip().split("\n") if f
        ]

        # Get full diff
        diff_result = subprocess.run(
            ["git", "stash", "show", "-p", stash_ref],
            cwd=project_root,
            capture_output=True,
            text=True,
            check=True,
        )

        return {
            "checkpoint_id": stash_ref,
            "files_changed": files_changed,
            "diff": diff_result.stdout,
            "stats": stat_result.stdout,
        }

    except subprocess.CalledProcessError as e:
        raise SafetyError(f"Failed to preview checkpoint: {e.stderr}") from e
    except Exception as e:
        raise SafetyError(f"Failed to preview checkpoint: {str(e)}") from e
