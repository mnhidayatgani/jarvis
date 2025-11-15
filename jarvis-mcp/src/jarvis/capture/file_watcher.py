"""File Watcher for JARVIS Auto-Capture.

Monitors file changes in real-time using watchdog library.
"""

import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

try:
    from watchdog.events import FileSystemEvent, FileSystemEventHandler
    from watchdog.observers import Observer  # noqa: F401

    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False
    FileSystemEventHandler = object  # type: ignore[misc, assignment]
    FileSystemEvent = Any  # type: ignore[misc, assignment]


class JarvisFileEventHandler(FileSystemEventHandler):
    """Custom file event handler for JARVIS."""

    def __init__(
        self,
        project_root: Path,
        on_change_callback: Callable[[Path, str], None],
        ignore_patterns: list[str] | None = None,
    ) -> None:
        """Initialize event handler.

        Args:
            project_root: Project root directory.
            on_change_callback: Callback function for file changes.
            ignore_patterns: Patterns to ignore.
        """
        super().__init__()
        self.project_root = project_root
        self.on_change_callback = on_change_callback
        self.ignore_patterns = ignore_patterns or [
            ".git/",
            ".jarvis/",
            "node_modules/",
            ".venv/",
            "venv/",
            "__pycache__/",
            ".pytest_cache/",
            "dist/",
            "build/",
            ".next/",
            "target/",
        ]
        self.last_event_time: dict[str, float] = {}
        self.debounce_seconds = 1.0

    def should_ignore(self, file_path: str) -> bool:
        """Check if file should be ignored.

        Args:
            file_path: Path to file.

        Returns:
            True if should be ignored.
        """
        for pattern in self.ignore_patterns:
            if pattern in file_path:
                return True
        return False

    def is_debounced(self, file_path: str) -> bool:
        """Check if event should be debounced.

        Args:
            file_path: Path to file.

        Returns:
            True if should be debounced.
        """
        current_time = time.time()
        last_time = self.last_event_time.get(file_path, 0)

        if current_time - last_time < self.debounce_seconds:
            return True

        self.last_event_time[file_path] = current_time
        return False

    def on_modified(self, event: FileSystemEvent) -> None:
        """Handle file modification event.

        Args:
            event: File system event.
        """
        if event.is_directory:
            return

        file_path = Path(str(event.src_path))

        # Ignore certain files
        if self.should_ignore(str(file_path)):
            return

        # Debounce rapid changes
        if self.is_debounced(str(file_path)):
            return

        # Call callback
        try:
            self.on_change_callback(file_path, "modified")
        except Exception:
            pass  # Silent failure to avoid disrupting user

    def on_created(self, event: FileSystemEvent) -> None:
        """Handle file creation event.

        Args:
            event: File system event.
        """
        if event.is_directory:
            return

        file_path = Path(str(event.src_path))

        if self.should_ignore(str(file_path)):
            return

        if self.is_debounced(str(file_path)):
            return

        try:
            self.on_change_callback(file_path, "created")
        except Exception:
            pass

    def on_deleted(self, event: FileSystemEvent) -> None:
        """Handle file deletion event.

        Args:
            event: File system event.
        """
        if event.is_directory:
            return

        file_path = Path(str(event.src_path))

        if self.should_ignore(str(file_path)):
            return

        try:
            self.on_change_callback(file_path, "deleted")
        except Exception:
            pass


class FileWatcher:
    """File system watcher for automatic code change tracking."""

    def __init__(self, project_root: Path) -> None:
        """Initialize FileWatcher.

        Args:
            project_root: Path to project root directory.
        """
        if not WATCHDOG_AVAILABLE:
            raise ImportError(
                "watchdog library not installed. Install with: pip install watchdog"
            )

        self.project_root = project_root
        self.observer: Any = None
        self.is_running = False
        self.on_change_callback: Callable[[Path, str], None] | None = None

    def start(
        self, on_change_callback: Callable[[Path, str], None]
    ) -> dict[str, Any]:
        """Start watching for file changes.

        Args:
            on_change_callback: Function to call on file changes.

        Returns:
            Status of watcher start.
        """
        if self.is_running:
            return {
                "success": False,
                "error": "Watcher already running",
            }

        try:
            self.on_change_callback = on_change_callback

            # Create event handler
            event_handler = JarvisFileEventHandler(
                project_root=self.project_root,
                on_change_callback=on_change_callback,
            )

            # Create observer
            if WATCHDOG_AVAILABLE:
                from watchdog.observers import Observer

                self.observer = Observer()
                self.observer.schedule(
                    event_handler, str(self.project_root), recursive=True
                )
                self.observer.start()
                self.is_running = True

            return {
                "success": True,
                "message": "File watcher started",
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def stop(self) -> dict[str, Any]:
        """Stop watching for file changes.

        Returns:
            Status of watcher stop.
        """
        if not self.is_running or not self.observer:
            return {
                "success": False,
                "error": "Watcher not running",
            }

        try:
            self.observer.stop()
            self.observer.join(timeout=5)
            self.is_running = False

            return {
                "success": True,
                "message": "File watcher stopped",
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }

    def is_active(self) -> bool:
        """Check if watcher is actively running.

        Returns:
            True if watcher is running.
        """
        return self.is_running and self.observer is not None


def create_file_watcher(project_root: Path) -> FileWatcher | None:
    """Create a file watcher instance.

    Args:
        project_root: Path to project root.

    Returns:
        FileWatcher instance or None if watchdog not available.
    """
    if not WATCHDOG_AVAILABLE:
        return None

    return FileWatcher(project_root)
