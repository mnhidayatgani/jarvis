"""MCP Tools for JARVIS Memory System.

Implements the MCP tool interface for memory operations.
"""

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

from jarvis.capture.git_hooks import GitHooks
from jarvis.capture.scanner import analyze_tech_stack, generate_scan_report
from jarvis.capture.validator import ValidationError, run_validation
from jarvis.memory.core import initialize_databases
from jarvis.memory.factual import FactualMemory
from jarvis.memory.remember import add_decision
from jarvis.memory.safety import (
    SafetyError,
    create_checkpoint,
    list_checkpoints,
    preview_checkpoint,
    rollback_to_checkpoint,
)
from jarvis.memory.semantic import SemanticMemory
from jarvis.utils.config import Configuration
from jarvis.utils.embeddings import EmbeddingsWrapper
from jarvis.utils.persona import JarvisPersona
from jarvis.mcp.error_handler import ErrorHandler, create_error_handler


class MCPTools:
    """MCP Tools implementation for JARVIS memory operations."""

    def __init__(self, project_root: Path, error_handler: ErrorHandler | None = None) -> None:
        """Initialize MCP tools with project context.

        Args:
            project_root: Path to project root directory.
            error_handler: Optional error handler instance (creates default if None).
        """
        self.project_root = project_root
        self.config = Configuration(project_root)
        self.persona = JarvisPersona()
        self.embeddings = EmbeddingsWrapper()
        self.error_handler = error_handler or create_error_handler()

        # Get project ID
        self.project_id = self.config.generate_project_id()

        # Initialize memory systems
        jarvis_dir = project_root / ".jarvis"
        self.factual = FactualMemory(jarvis_dir / "db" / "memory.db")
        self.semantic = SemanticMemory(jarvis_dir / "db" / "chroma", self.project_id)

    def remember_context(
        self,
        content: str,
        type: str = "decision",
        tags: list[str] | None = None,
        file_path: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Store information to JARVIS memory.

        Args:
            content: Content to remember.
            type: Memory type (decision, note, architecture, etc.).
            tags: Optional tags for categorization.
            file_path: Optional file path related to this memory.
            metadata: Optional additional metadata.

        Returns:
            Response with memory_id, timestamp, and confirmation message.
        """
        try:
            # For decision type, use the new add_decision function
            if type == "decision":
                result = add_decision(str(self.project_root), content)

                return {
                    "success": True,
                    "memory_id": result["id"],
                    "type": type,
                    "timestamp": result["timestamp"],
                    "message": self.persona.format_success(
                        "Understood, Sir. I have recorded that decision."
                    ),
                }

            # For other types, use existing implementation
            # Generate memory ID
            memory_id = self._generate_memory_id(content)

            # Get current timestamp
            timestamp = datetime.utcnow().isoformat()

            # Handle long content chunking
            chunks = self._chunk_content(content)

            # Store in FactualMemory
            self.factual.create_entry(
                project_id=self.project_id,
                content=content,
                content_type=type,
                file_path=file_path,
                metadata={
                    "tags": tags or [],
                    **(metadata or {}),
                },
            )

            # Generate embedding and store in SemanticMemory
            for i, chunk in enumerate(chunks):
                chunk_id = f"{memory_id}_chunk_{i}" if len(chunks) > 1 else memory_id
                chunk_metadata = {
                    "type": type,
                    "file_path": file_path or "",
                    "tags": json.dumps(tags or []),
                    "timestamp": timestamp,
                    "chunk_index": str(i),
                    "total_chunks": str(len(chunks)),
                }
                if metadata:
                    chunk_metadata.update({k: str(v) for k, v in metadata.items()})

                self.semantic.add_semantic_entry(
                    entry_id=chunk_id, content=chunk, metadata=chunk_metadata
                )

            # Return success response with JARVIS persona
            return {
                "success": True,
                "memory_id": memory_id,
                "type": type,
                "timestamp": timestamp,
                "chunks": len(chunks),
                "message": self.persona.format_success(
                    f"Memory stored, Sir. {len(chunks)} {'chunk' if len(chunks) == 1 else 'chunks'} indexed."
                ),
            }

        except Exception as e:
            return self.error_handler.handle(
                e,
                context={"tool": "remember_context", "content_length": len(content), "type": type}
            )

    def recall_context(
        self,
        query: str,
        type_filter: str | None = None,
        file_filter: str | None = None,
        since: str | None = None,
        limit: int = 10,
    ) -> dict[str, Any]:
        """Search JARVIS memory semantically.

        Args:
            query: Search query.
            type_filter: Optional filter by memory type.
            file_filter: Optional filter by file path.
            since: Optional filter by timestamp (ISO format).
            limit: Maximum number of results.

        Returns:
            Response with ranked results and relevance scores.
        """
        try:
            # Search semantic memory
            search_results = self.semantic.search_semantic(
                query=query, n_results=limit * 2  # Get more for filtering
            )

            # Apply filters
            filtered_results = []
            for result in search_results:
                metadata = result.get("metadata", {})

                # Type filter
                if type_filter and metadata.get("type") != type_filter:
                    continue

                # File filter
                if file_filter and metadata.get("file_path") != file_filter:
                    continue

                # Time filter
                if since:
                    result_time = metadata.get("timestamp", "")
                    if result_time < since:
                        continue

                filtered_results.append(result)

                if len(filtered_results) >= limit:
                    break

            # Format results
            formatted_results = []
            for result in filtered_results:
                metadata = result.get("metadata", {})
                # Parse tags if they're JSON
                tags = metadata.get("tags", [])
                if isinstance(tags, str):
                    try:
                        tags = json.loads(tags)
                    except json.JSONDecodeError:
                        tags = []

                formatted_results.append(
                    {
                        "content": result.get("content", ""),
                        "type": metadata.get("type"),
                        "file_path": metadata.get("file_path"),
                        "timestamp": metadata.get("timestamp"),
                        "relevance_score": result.get("distance", 1.0),
                        "tags": tags,
                    }
                )

            # Return results with JARVIS persona
            count = len(formatted_results)
            if count > 0:
                message = self.persona.format_success(
                    f"Found {count} {'memory' if count == 1 else 'memories'}, Sir."
                )
            else:
                message = "No memories found matching your query, Sir."

            return {
                "success": True,
                "query": query,
                "count": count,
                "results": formatted_results,
                "message": message,
            }

        except Exception as e:
            return self.error_handler.handle(
                e,
                context={"tool": "recall_context", "query": query, "limit": limit}
            )

    def _generate_memory_id(self, content: str) -> str:
        """Generate unique memory ID from content and timestamp.

        Args:
            content: Memory content.

        Returns:
            SHA256 hash as memory ID.
        """
        timestamp = datetime.utcnow().isoformat()
        data = f"{content}_{timestamp}"
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    def _chunk_content(self, content: str, max_words: int = 1000) -> list[str]:
        """Chunk long content for efficient embedding.

        Args:
            content: Content to chunk.
            max_words: Maximum words per chunk.

        Returns:
            List of content chunks.
        """
        words = content.split()

        if len(words) <= max_words:
            return [content]

        chunks = []
        for i in range(0, len(words), max_words):
            chunk_words = words[i : i + max_words]
            chunks.append(" ".join(chunk_words))

        return chunks

    def analyze_codebase(
        self, verbose: bool = False, interactive: bool = False
    ) -> dict[str, Any]:
        """Analyze existing codebase and populate project context.

        Uses the scanner module for comprehensive tech stack detection.

        Args:
            verbose: Include detailed analysis.
            interactive: Enable interactive Q&A mode.

        Returns:
            Analysis report with tech stack, dependencies, structure, inconsistencies.
        """
        try:
            # Initialize databases if not already initialized
            initialize_databases(str(self.project_root))

            # Use scanner for comprehensive analysis
            analysis = analyze_tech_stack(self.project_root)

            # Generate human-readable report
            report_text = generate_scan_report(analysis)

            # Scan dependencies (keep existing implementation for detailed deps)
            dependencies = self._scan_dependencies()

            # Detect inconsistencies
            inconsistencies = self._detect_inconsistencies()

            # Generate clarifying questions
            questions = self._generate_questions(
                analysis["tech_stack"], inconsistencies
            )

            # Update ProjectContext
            self._update_project_context(
                tech_stack=analysis["tech_stack"],
                dependencies=dependencies,
                file_structure={"file_count": analysis["file_count"]},
            )

            # Return analysis report
            return {
                "success": True,
                "data": {
                    "tech_stack": analysis["tech_stack"],
                    "dependencies": dependencies,
                    "file_count": analysis["file_count"],
                    "directory_count": analysis["directory_count"],
                    "file_types": analysis["file_types"],
                    "project_files": analysis["project_files"],
                    "inconsistencies": inconsistencies,
                    "questions": questions,
                    "suggestions": self._generate_suggestions(
                        analysis["tech_stack"], inconsistencies
                    )
                    if verbose
                    else [],
                },
                "report": report_text,
                "message": self.persona.format_success(
                    f"Analysis complete, Sir. Found {len(analysis['tech_stack'])} technologies."
                ),
            }

        except Exception as e:
            return self.error_handler.handle(
                e,
                context={"tool": "analyze_codebase", "project_root": str(self.project_root)}
            )

    def _detect_tech_stack(self) -> list[str]:
        """Detect technologies from project files."""
        tech_stack = set()

        # Check for package managers and config files
        indicators = {
            "package.json": ["JavaScript", "Node.js"],
            "package-lock.json": ["npm"],
            "yarn.lock": ["Yarn"],
            "pnpm-lock.yaml": ["pnpm"],
            "tsconfig.json": ["TypeScript"],
            "pyproject.toml": ["Python"],
            "requirements.txt": ["Python", "pip"],
            "Pipfile": ["Python", "Pipenv"],
            "poetry.lock": ["Poetry"],
            "Gemfile": ["Ruby", "Bundler"],
            "Gemfile.lock": ["Bundler"],
            "go.mod": ["Go"],
            "go.sum": ["Go"],
            "Cargo.toml": ["Rust", "Cargo"],
            "Cargo.lock": ["Cargo"],
            "pom.xml": ["Java", "Maven"],
            "build.gradle": ["Java", "Gradle"],
            "composer.json": ["PHP", "Composer"],
            ".csproj": ["C#", ".NET"],
            "mix.exs": ["Elixir"],
        }

        for file, techs in indicators.items():
            if (self.project_root / file).exists():
                tech_stack.update(techs)

        # Check for common directories
        if (self.project_root / "node_modules").exists():
            tech_stack.add("Node.js")
        if (self.project_root / ".venv").exists() or (
            self.project_root / "venv"
        ).exists():
            tech_stack.add("Python")

        return sorted(tech_stack)

    def _scan_dependencies(self) -> dict[str, list[str]]:
        """Scan project dependencies from package files."""
        dependencies: dict[str, list[str]] = {}

        # Node.js
        package_json = self.project_root / "package.json"
        if package_json.exists():
            try:
                with open(package_json) as f:
                    data = json.load(f)
                    deps: dict[str, Any] = {}
                    deps.update(data.get("dependencies", {}))
                    deps.update(data.get("devDependencies", {}))
                    dependencies["npm"] = list(deps.keys())
            except (json.JSONDecodeError, OSError):
                pass

        # Python
        pyproject = self.project_root / "pyproject.toml"
        if pyproject.exists():
            try:
                content = pyproject.read_text()
                # Simple parsing for dependencies
                deps_list = re.findall(r'"([a-zA-Z0-9\-_]+)"', content)
                dependencies["python"] = deps_list[:20]  # Limit to avoid clutter
            except OSError:
                pass

        # Ruby
        gemfile = self.project_root / "Gemfile"
        if gemfile.exists():
            try:
                content = gemfile.read_text()
                deps_list = re.findall(r"gem\s+['\"]([^'\"]+)['\"]", content)
                dependencies["ruby"] = deps_list
            except OSError:
                pass

        return dependencies

    def _build_file_structure(self) -> dict[str, Any]:
        """Build file structure map."""
        file_count = 0
        dir_count = 0

        # Patterns to ignore
        ignore_patterns = {
            "node_modules",
            ".git",
            ".venv",
            "venv",
            "__pycache__",
            "dist",
            "build",
            ".next",
            "target",
        }

        for item in self.project_root.rglob("*"):
            # Skip ignored directories
            if any(pattern in item.parts for pattern in ignore_patterns):
                continue

            if item.is_file():
                file_count += 1
            elif item.is_dir():
                dir_count += 1

        return {"file_count": file_count, "directory_count": dir_count}

    def _detect_inconsistencies(self) -> list[dict[str, Any]]:
        """Detect code inconsistencies."""
        inconsistencies = []

        # Check for mixed import styles (Python)
        py_files = list(self.project_root.glob("**/*.py"))
        if len(py_files) > 5:
            has_relative = False
            has_absolute = False

            for py_file in py_files[:10]:  # Sample
                try:
                    content = py_file.read_text()
                    if re.search(r"from\s+\.", content):
                        has_relative = True
                    if re.search(r"from\s+[a-zA-Z]", content):
                        has_absolute = True
                except OSError:
                    pass

            if has_relative and has_absolute:
                inconsistencies.append(
                    {
                        "type": "Import Style",
                        "description": "Mixed relative and absolute imports detected",
                        "severity": "low",
                    }
                )

        return inconsistencies

    def _generate_questions(
        self, tech_stack: list[str], inconsistencies: list[dict[str, Any]]
    ) -> list[str]:
        """Generate clarifying questions based on analysis."""
        questions = []

        # Ask about primary language if multiple detected
        languages = [
            "JavaScript",
            "TypeScript",
            "Python",
            "Ruby",
            "Go",
            "Rust",
            "Java",
        ]
        detected_langs = [t for t in tech_stack if t in languages]

        if len(detected_langs) > 1:
            questions.append(
                f"Multiple languages detected ({', '.join(detected_langs)}). Which is the primary language?"
            )

        # Ask about architecture if unclear
        if not any(
            (self.project_root / d).exists() for d in ["src", "lib", "app", "pkg"]
        ):
            questions.append("What is your preferred project structure convention?")

        return questions

    def _generate_suggestions(
        self, tech_stack: list[str], inconsistencies: list[dict[str, Any]]
    ) -> list[str]:
        """Generate improvement suggestions."""
        suggestions = []

        if inconsistencies:
            suggestions.append(
                "Consider standardizing code style with linters/formatters"
            )

        if "TypeScript" in tech_stack:
            if not (self.project_root / "tsconfig.json").exists():
                suggestions.append("Add tsconfig.json for TypeScript configuration")

        if "Python" in tech_stack:
            if not (self.project_root / "pyproject.toml").exists():
                suggestions.append("Consider using pyproject.toml for modern Python projects")

        return suggestions

    def _update_project_context(
        self,
        tech_stack: list[str],
        dependencies: dict[str, list[str]],
        file_structure: dict[str, Any],
    ) -> None:
        """Update project context in storage."""
        context_file = self.project_root / ".jarvis" / "project_context.json"

        if context_file.exists():
            try:
                with open(context_file) as f:
                    context = json.load(f)
            except (json.JSONDecodeError, OSError):
                context = {}
        else:
            context = {}

        # Update fields
        context["tech_stack"] = tech_stack
        context["dependencies"] = dependencies
        context["file_structure_map"] = file_structure
        context["updated_at"] = datetime.utcnow().isoformat()

        # Save
        try:
            with open(context_file, "w") as f:
                json.dump(context, f, indent=2)
        except OSError:
            pass

    def install_git_hooks(self, force: bool = False) -> dict[str, Any]:
        """Install git hooks for automatic code change capture.

        Args:
            force: Overwrite existing hooks.

        Returns:
            Installation status.
        """
        try:
            hooks = GitHooks(self.project_root)
            result = hooks.install_hooks(force)

            if result["success"]:
                message = self.persona.format_success(
                    f"Git hooks installed, Sir. {len(result['installed'])} hook(s) active."
                )
            else:
                message = self.persona.format_error(
                    result.get("message", "Installation failed")
                )

            return {
                **result,
                "message": message,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(f"Hook installation failed: {str(e)}"),
            }

    def capture_code_change(
        self,
        file_path: str,
        change_type: str,
        diff_content: str | None = None,
        commit_sha: str | None = None,
        commit_message: str | None = None,
    ) -> dict[str, Any]:
        """Capture a code change event.

        Args:
            file_path: Path to changed file.
            change_type: Type of change (modified, created, deleted).
            diff_content: Diff content if available.
            commit_sha: Git commit SHA if committed.
            commit_message: Git commit message if committed.

        Returns:
            Capture status.
        """
        try:
            timestamp = datetime.utcnow().isoformat()

            # Create factual memory entry
            entry_id = self.factual.create_entry(
                project_id=self.project_id,
                content=f"Code change: {change_type} {file_path}",
                content_type="code_change",
                file_path=file_path,
                commit_sha=commit_sha,
                metadata={
                    "change_type": change_type,
                    "has_diff": diff_content is not None,
                    "commit_message": commit_message or "",
                },
            )

            # Store diff in semantic memory if available
            if diff_content:
                self.semantic.add_semantic_entry(
                    entry_id=entry_id,
                    content=f"File: {file_path}\n{change_type}\n{diff_content}",
                    metadata={
                        "type": "code_change",
                        "file_path": file_path,
                        "change_type": change_type,
                        "commit_sha": commit_sha or "",
                        "timestamp": timestamp,
                    },
                )

            # Extract decision if commit message contains decision keywords
            if commit_message and self._contains_decision(commit_message):
                decision_id = self.factual.create_entry(
                    project_id=self.project_id,
                    content=commit_message,
                    content_type="decision",
                    file_path=file_path,
                    commit_sha=commit_sha,
                    metadata={
                        "extracted_from": "commit_message",
                        "related_change": entry_id,
                    },
                )

                self.semantic.add_semantic_entry(
                    entry_id=decision_id,
                    content=commit_message,
                    metadata={
                        "type": "decision",
                        "file_path": file_path,
                        "timestamp": timestamp,
                    },
                )

            return {
                "success": True,
                "entry_id": entry_id,
                "timestamp": timestamp,
                "decision_detected": commit_message is not None
                and self._contains_decision(commit_message),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def get_memory_status(self) -> dict[str, Any]:
        """Get memory system statistics.

        Returns:
            Dictionary with memory stats including counts, disk usage, last activity.
        """
        try:
            from jarvis.memory.recall import get_memory_status

            stats = get_memory_status(str(self.project_root))

            return {
                "success": True,
                "data": stats,
                "message": self.persona.format_response(
                    f"Memory status: {stats['total_entries']} total entries, "
                    f"{stats['disk_usage_mb']} MB storage"
                ),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(
                    f"Unable to retrieve memory status: {str(e)}"
                ),
            }

    def run_health_checks(self) -> dict[str, Any]:
        """Run system health diagnostics.

        Returns:
            Dictionary with health check results and recommendations.
        """
        try:
            from jarvis.utils.doctor import run_health_checks

            results = run_health_checks(str(self.project_root))

            # Format message based on results
            if results["overall"] == "healthy":
                message = self.persona.format_response(
                    f"All systems operational, Sir. {results['passed']} checks passed."
                )
            else:
                issues = results["failed"] + results["warnings"]
                message = self.persona.format_response(
                    f"Detected {issues} issue(s), Sir. "
                    f"{results['passed']} checks passed, "
                    f"{results['failed']} failed, "
                    f"{results['warnings']} warnings."
                )

            return {
                "success": True,
                "data": results,
                "message": message,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(
                    f"Health check failed: {str(e)}"
                ),
            }

    def _contains_decision(self, text: str) -> bool:
        """Check if text contains decision keywords.

        Args:
            text: Text to check.

        Returns:
            True if decision keywords found.
        """
        keywords = [
            "because",
            "chose",
            "decided",
            "decision",
            "selected",
            "using",
            "instead of",
            "rather than",
        ]

        text_lower = text.lower()
        return any(keyword in text_lower for keyword in keywords)

    def on_commit(
        self,
        commit_sha: str,
        commit_message: str,
        author: str,
        date: str,
        files_changed: list[str],
        diff_path: str,
        project_root: str,
    ) -> dict[str, Any]:
        """Capture git commit event and store in memory.

        Called by git post-commit hook to automatically track code changes.

        Args:
            commit_sha: Git commit SHA hash.
            commit_message: Commit message.
            author: Commit author.
            date: Commit date (ISO format).
            files_changed: List of files changed in commit.
            diff_path: Path to saved diff file.
            project_root: Project root path.

        Returns:
            Dictionary with capture status and metadata.
        """
        try:
            from jarvis.memory.remember import add_commit_event

            result = add_commit_event(
                project_path=project_root,
                commit_sha=commit_sha,
                commit_message=commit_message,
                author=author,
                date=date,
                files_changed=files_changed,
                diff_path=diff_path,
            )

            # Format message based on whether decision was detected
            if result.get("has_decision"):
                message = self.persona.format_response(
                    f"Commit captured, Sir. I detected a decision in the commit message. "
                    f"{result['files_count']} file(s) modified."
                )
            else:
                message = self.persona.format_response(
                    f"Commit captured: {result['files_count']} file(s) modified."
                )

            return {
                "success": True,
                "commit_sha": commit_sha,
                "memory_id": result["id"],
                "files_count": result["files_count"],
                "has_decision": result.get("has_decision", False),
                "timestamp": result["timestamp"],
                "message": message,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(
                    f"Failed to capture commit: {str(e)}"
                ),
            }

    def create_checkpoint(
        self,
        reason: str,
    ) -> dict[str, Any]:
        """Create a safety checkpoint using git stash.

        Args:
            reason: Human-readable reason for checkpoint.

        Returns:
            Dictionary with checkpoint information.
        """
        try:
            result = create_checkpoint(
                project_root=str(self.project_root),
                reason=reason,
                project_id=self.project_id,
                factual_memory=self.factual,
            )

            if not result["has_changes"]:
                message = self.persona.format_response(
                    "No changes to checkpoint, Sir. Working directory is clean."
                )
            else:
                message = self.persona.format_response(
                    f"Checkpoint created: {result['checkpoint_id']}, Sir. "
                    f"{len(result['files_affected'])} file(s) protected."
                )

            return {
                "success": True,
                "data": result,
                "message": message,
            }

        except SafetyError as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(f"Checkpoint creation failed: {str(e)}"),
            }

    def list_checkpoints(self) -> dict[str, Any]:
        """List all available checkpoints.

        Returns:
            Dictionary with list of checkpoints.
        """
        try:
            checkpoints = list_checkpoints(str(self.project_root))

            if not checkpoints:
                message = self.persona.format_response("No checkpoints found, Sir.")
            else:
                message = self.persona.format_response(
                    f"Found {len(checkpoints)} checkpoint(s), Sir."
                )

            return {
                "success": True,
                "data": {"checkpoints": checkpoints},
                "message": message,
            }

        except SafetyError as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(f"Failed to list checkpoints: {str(e)}"),
            }

    def preview_checkpoint(
        self,
        checkpoint_id: str | None = None,
    ) -> dict[str, Any]:
        """Preview what would change if a checkpoint were applied.

        Args:
            checkpoint_id: Stash reference. If None, uses latest.

        Returns:
            Dictionary with preview information.
        """
        try:
            preview = preview_checkpoint(str(self.project_root), checkpoint_id)

            message = self.persona.format_response(
                f"Preview for {preview['checkpoint_id']}: "
                f"{len(preview['files_changed'])} file(s) would be restored, Sir."
            )

            return {
                "success": True,
                "data": preview,
                "message": message,
            }

        except SafetyError as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(f"Preview failed: {str(e)}"),
            }

    def rollback_to_checkpoint(
        self,
        checkpoint_id: str | None = None,
        keep_checkpoint: bool = False,
    ) -> dict[str, Any]:
        """Rollback to a previous checkpoint.

        Args:
            checkpoint_id: Stash reference. If None, uses latest.
            keep_checkpoint: If True, keep the stash after applying.

        Returns:
            Dictionary with rollback information.
        """
        try:
            result = rollback_to_checkpoint(
                project_root=str(self.project_root),
                checkpoint_id=checkpoint_id,
                keep_checkpoint=keep_checkpoint,
            )

            action = "restored and preserved" if keep_checkpoint else "restored"
            message = self.persona.format_response(
                f"Checkpoint {action}, Sir. "
                f"{len(result['files_restored'])} file(s) restored."
            )

            return {
                "success": True,
                "data": result,
                "message": message,
            }

        except SafetyError as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(f"Rollback failed: {str(e)}"),
            }

    def validate_changes(self) -> dict[str, Any]:
        """Run validation checks on the project.

        Returns:
            Dictionary with validation results.
        """
        try:
            result = run_validation(str(self.project_root))

            if result["overall_passed"]:
                message = self.persona.format_response(
                    f"All validation checks passed, Sir. "
                    f"{result['passed_checks']}/{result['total_checks']} checks successful "
                    f"in {result['duration_seconds']:.1f}s."
                )
            else:
                message = self.persona.format_error(
                    f"Validation failed, Sir: {result['failed_checks']} of {result['total_checks']} checks failed."
                )

            return {
                "success": True,
                "data": result,
                "message": message,
            }

        except ValidationError as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(f"Validation unavailable: {str(e)}"),
            }


def get_mcp_tools(project_root: Path) -> MCPTools:
    """Get MCP tools instance for a project.

    Args:
        project_root: Path to project root.

    Returns:
        MCPTools instance.
    """
    return MCPTools(project_root)
