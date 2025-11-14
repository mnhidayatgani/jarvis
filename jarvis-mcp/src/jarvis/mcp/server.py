"""MCP Server for JARVIS Memory System.

Exposes JARVIS memory tools via Model Context Protocol for AI agent integration.
"""

import json
import logging
from pathlib import Path
from typing import Any

from jarvis.mcp.tools import MCPTools

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class MCPServer:
    """MCP Server for JARVIS memory operations."""

    def __init__(self, project_root: Path, port: int = 3000) -> None:
        """Initialize MCP server.

        Args:
            project_root: Path to project root directory.
            port: Server port (default 3000).
        """
        self.project_root = project_root
        self.port = port
        self.tools = MCPTools(project_root)
        self.is_running = False
        self.request_count = 0
        self.error_count = 0

    async def handle_tool_call(
        self, tool_name: str, arguments: dict[str, Any]
    ) -> dict[str, Any]:
        """Handle MCP tool call.

        Args:
            tool_name: Name of the tool to call.
            arguments: Tool arguments.

        Returns:
            Tool execution result.
        """
        self.request_count += 1

        try:
            logger.info(f"Tool call: {tool_name} with {len(arguments)} arguments")

            # Route to appropriate tool
            if tool_name == "remember_context":
                result = self.tools.remember_context(**arguments)
            elif tool_name == "recall_context":
                result = self.tools.recall_context(**arguments)
            elif tool_name == "analyze_codebase":
                result = self.tools.analyze_codebase(**arguments)
            elif tool_name == "install_git_hooks":
                result = self.tools.install_git_hooks(**arguments)
            elif tool_name == "capture_code_change":
                result = self.tools.capture_code_change(**arguments)
            elif tool_name == "get_architecture":
                result = self._get_architecture()
            elif tool_name == "validate_changes":
                result = self._validate_changes(arguments.get("changes", []))
            elif tool_name == "create_checkpoint":
                result = self._create_checkpoint(
                    arguments.get("reason", "Manual checkpoint"),
                    arguments.get("files_affected", []),
                )
            elif tool_name == "rollback":
                result = self._rollback(arguments.get("checkpoint_id"))
            elif tool_name == "switch_project":
                result = self._switch_project(arguments.get("project_path"))
            else:
                result = {
                    "success": False,
                    "error": f"Unknown tool: {tool_name}",
                }

            if not result.get("success", True):
                self.error_count += 1

            return result

        except Exception as e:
            self.error_count += 1
            logger.error(f"Tool call error: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "message": f"Tool execution failed: {str(e)}",
            }

    def _get_architecture(self) -> dict[str, Any]:
        """Get project architecture and file structure.

        Returns:
            Project architecture information.
        """
        try:
            # Read project context
            context_file = self.project_root / ".jarvis" / "project_context.json"

            if context_file.exists():
                with open(context_file) as f:
                    context = json.load(f)

                return {
                    "success": True,
                    "tech_stack": context.get("tech_stack", []),
                    "dependencies": context.get("dependencies", {}),
                    "file_structure_map": context.get("file_structure_map", {}),
                    "updated_at": context.get("updated_at"),
                }

            return {
                "success": False,
                "error": "Project context not found. Run 'jarvis scan' first.",
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _validate_changes(self, changes: list[dict[str, Any]]) -> dict[str, Any]:
        """Validate proposed code changes.

        Args:
            changes: List of changes to validate.

        Returns:
            Validation results.
        """
        # Basic validation implementation
        issues = []
        warnings = []

        for change in changes:
            file_path = change.get("file_path", "")

            # Check file exists for modifications
            if change.get("type") == "modify":
                if not (self.project_root / file_path).exists():
                    issues.append(f"File not found: {file_path}")

            # Warn about sensitive files
            sensitive_patterns = [
                ".env",
                "config",
                "secret",
                "password",
                "key",
                "token",
            ]
            if any(pattern in file_path.lower() for pattern in sensitive_patterns):
                warnings.append(f"Modifying sensitive file: {file_path}")

        return {
            "success": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "validated_count": len(changes),
            "message": f"Validated {len(changes)} changes. {len(issues)} issues, {len(warnings)} warnings.",
        }

    def _create_checkpoint(
        self, reason: str, files_affected: list[str]
    ) -> dict[str, Any]:
        """Create safety checkpoint.

        Args:
            reason: Reason for checkpoint.
            files_affected: List of files to include.

        Returns:
            Checkpoint creation result.
        """
        try:
            # Use git stash to create checkpoint
            import subprocess
            from datetime import datetime

            timestamp = datetime.utcnow().isoformat()
            stash_message = f"JARVIS checkpoint: {reason} ({timestamp})"

            result = subprocess.run(
                ["git", "stash", "push", "-m", stash_message],
                cwd=self.project_root,
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                # Get stash reference
                stash_ref = subprocess.run(
                    ["git", "rev-parse", "stash@{0}"],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                ).stdout.strip()

                return {
                    "success": True,
                    "checkpoint_id": stash_ref,
                    "reason": reason,
                    "files_affected": files_affected,
                    "timestamp": timestamp,
                    "message": f"Checkpoint created: {stash_ref[:8]}",
                }

            return {
                "success": False,
                "error": "No changes to checkpoint",
                "message": "Working directory clean, Sir.",
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _rollback(self, checkpoint_id: str | None = None) -> dict[str, Any]:
        """Rollback to checkpoint.

        Args:
            checkpoint_id: Optional specific checkpoint ID.

        Returns:
            Rollback result.
        """
        try:
            import subprocess

            # Apply stash
            if checkpoint_id:
                result = subprocess.run(
                    ["git", "stash", "apply", checkpoint_id],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                )
            else:
                result = subprocess.run(
                    ["git", "stash", "pop"],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                )

            if result.returncode == 0:
                return {
                    "success": True,
                    "message": "Rollback successful, Sir.",
                }

            return {
                "success": False,
                "error": result.stderr,
                "message": "Rollback failed, Sir.",
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def _switch_project(self, project_path: str | None) -> dict[str, Any]:
        """Switch to different project.

        Args:
            project_path: Path to new project.

        Returns:
            Switch result.
        """
        if not project_path:
            return {
                "success": False,
                "error": "No project path provided",
            }

        try:
            new_project_root = Path(project_path).resolve()

            if not new_project_root.exists():
                return {
                    "success": False,
                    "error": f"Project not found: {project_path}",
                }

            # Check if JARVIS initialized
            if not (new_project_root / ".jarvis").exists():
                return {
                    "success": False,
                    "error": "Project not initialized. Run 'jarvis init' first.",
                }

            # Switch project
            self.project_root = new_project_root
            self.tools = MCPTools(new_project_root)

            return {
                "success": True,
                "project_path": str(new_project_root),
                "message": f"Switched to project: {new_project_root.name}",
            }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_stats(self) -> dict[str, Any]:
        """Get server statistics.

        Returns:
            Server statistics.
        """
        return {
            "is_running": self.is_running,
            "port": self.port,
            "project_root": str(self.project_root),
            "request_count": self.request_count,
            "error_count": self.error_count,
            "error_rate": self.error_count / max(self.request_count, 1),
        }

    async def start(self) -> None:
        """Start MCP server."""
        self.is_running = True
        logger.info(f"MCP Server started on port {self.port}")
        logger.info(f"Project root: {self.project_root}")

    async def stop(self) -> None:
        """Stop MCP server gracefully."""
        self.is_running = False
        logger.info("MCP Server stopped")

    async def health_check(self) -> dict[str, Any]:
        """Check server health.

        Returns:
            Health status.
        """
        return {
            "status": "healthy" if self.is_running else "stopped",
            "stats": self.get_stats(),
        }


def create_server(project_root: Path, port: int = 3000) -> MCPServer:
    """Create MCP server instance.

    Args:
        project_root: Path to project root.
        port: Server port.

    Returns:
        MCPServer instance.
    """
    return MCPServer(project_root, port)
