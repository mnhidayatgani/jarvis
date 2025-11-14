"""Configuration management for JARVIS.

Handles loading and merging of global (~/.jarvis/config.json) and
project-level (.jarvis/config.json) configuration files.
"""

import hashlib
import json
from pathlib import Path
from typing import Any, TypedDict, cast


class UserConfig(TypedDict):
    """User configuration structure matching Constitution 2.2."""

    language: str
    responseStyle: str
    persona: str


# Default configuration from Constitution 2.2
DEFAULT_CONFIG: UserConfig = {
    "language": "en",
    "responseStyle": "concise",
    "persona": "jarvis",
}


class Configuration:
    """Manages JARVIS configuration with global and project-level settings."""

    def __init__(self, project_root: Path | None = None) -> None:
        """Initialize configuration.

        Args:
            project_root: Optional project root directory.
                         If None, only global config is loaded.
        """
        self.project_root = project_root
        self._config: dict[str, Any] = {}
        self._load_config()

    def _load_config(self) -> None:
        """Load and merge global and project configurations."""
        # Start with defaults
        self._config = dict(DEFAULT_CONFIG)

        # Load global config
        global_config = self._load_global_config()
        if global_config:
            self._config.update(global_config)

        # Load project config if project_root is set
        if self.project_root:
            project_config = self._load_project_config()
            if project_config:
                self._config.update(project_config)

    def _load_global_config(self) -> dict[str, Any]:
        """Load global configuration from ~/.jarvis/config.json.

        Returns:
            Global configuration dict, or empty dict if not found.
        """
        config_path = self._get_global_config_path()
        return self._read_config_file(config_path)

    def _load_project_config(self) -> dict[str, Any]:
        """Load project configuration from .jarvis/config.json.

        Returns:
            Project configuration dict, or empty dict if not found.
        """
        if not self.project_root:
            return {}

        config_path = self.project_root / ".jarvis" / "config.json"
        return self._read_config_file(config_path)

    def _read_config_file(self, path: Path) -> dict[str, Any]:
        """Read a configuration file.

        Args:
            path: Path to configuration file.

        Returns:
            Configuration dict, or empty dict if file doesn't exist or is invalid.
        """
        if not path.exists():
            return {}

        try:
            with open(path, encoding="utf-8") as f:
                result: dict[str, Any] = json.load(f)
                return result
        except (json.JSONDecodeError, OSError) as e:
            print(f"Warning: Failed to load config from {path}: {e}")
            return {}

    @staticmethod
    def _get_global_config_path() -> Path:
        """Get path to global configuration file.

        Returns:
            Path to ~/.jarvis/config.json
        """
        home = Path.home()
        return home / ".jarvis" / "config.json"

    def get_config(self, key: str | None = None) -> Any:
        """Get configuration value.

        Args:
            key: Configuration key. If None, returns entire config.

        Returns:
            Configuration value or entire config dict.
        """
        if key is None:
            return self._config.copy()
        return self._config.get(key)

    def set_config(self, key: str, value: Any, global_scope: bool = False) -> None:
        """Set configuration value.

        Args:
            key: Configuration key.
            value: Configuration value.
            global_scope: If True, save to global config. Otherwise, save to project config.

        Raises:
            ValueError: If global_scope is False but no project_root is set.
        """
        self._config[key] = value

        if global_scope:
            self._save_global_config()
        else:
            if not self.project_root:
                raise ValueError("Cannot save project config without project_root")
            self._save_project_config()

    def validate_config(self) -> bool:
        """Validate current configuration.

        Returns:
            True if configuration is valid, False otherwise.
        """
        # Check required keys exist
        required_keys = ["language", "responseStyle", "persona"]
        for key in required_keys:
            if key not in self._config:
                return False

        # Validate language is a string
        if not isinstance(self._config.get("language"), str):
            return False

        # Validate responseStyle is one of allowed values
        allowed_styles = ["concise", "verbose", "detailed"]
        if self._config.get("responseStyle") not in allowed_styles:
            return False

        return True

    def _save_global_config(self) -> None:
        """Save current configuration to global config file."""
        config_path = self._get_global_config_path()
        self._write_config_file(config_path, self._config)

    def _save_project_config(self) -> None:
        """Save current configuration to project config file."""
        if not self.project_root:
            return

        config_path = self.project_root / ".jarvis" / "config.json"
        self._write_config_file(config_path, self._config)

    def _write_config_file(self, path: Path, config: dict[str, Any]) -> None:
        """Write configuration to file.

        Args:
            path: Path to configuration file.
            config: Configuration dict to write.
        """
        # Ensure directory exists
        path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
        except IOError as e:
            print(f"Warning: Failed to save config to {path}: {e}")

    def generate_project_id(self, project_path: Path | None = None) -> str:
        """Generate unique project ID from absolute path.

        Args:
            project_path: Project path. If None, uses self.project_root.

        Returns:
            SHA256 hash of absolute project path.

        Raises:
            ValueError: If no project path is available.
        """
        path = project_path or self.project_root
        if not path:
            raise ValueError("No project path available for ID generation")

        # Get absolute path and convert to string
        abs_path = path.resolve().as_posix()

        # Generate SHA256 hash
        return hashlib.sha256(abs_path.encode("utf-8")).hexdigest()


def get_config(
    key: str | None = None, project_root: Path | None = None
) -> Any:
    """Convenience function to get configuration value.

    Args:
        key: Configuration key. If None, returns entire config.
        project_root: Optional project root directory.

    Returns:
        Configuration value or entire config dict.
    """
    config = Configuration(project_root)
    return config.get_config(key)


def set_config(
    key: str,
    value: Any,
    global_scope: bool = False,
    project_root: Path | None = None,
) -> None:
    """Convenience function to set configuration value.

    Args:
        key: Configuration key.
        value: Configuration value.
        global_scope: If True, save to global config.
        project_root: Optional project root directory.
    """
    config = Configuration(project_root)
    config.set_config(key, value, global_scope)


def validate_config(project_root: Path | None = None) -> bool:
    """Convenience function to validate configuration.

    Args:
        project_root: Optional project root directory.

    Returns:
        True if configuration is valid, False otherwise.
    """
    config = Configuration(project_root)
    return config.validate_config()


# US-1.1: Additional helper functions for MCP server


def get_config_path() -> Path:
    """Get path to global configuration file.

    Returns:
        Path object for ~/.jarvis/config.json
    """
    return Path.home() / ".jarvis" / "config.json"


def load_config() -> UserConfig:
    """Load global user configuration from ~/.jarvis/config.json.

    This function loads the user's global preferences and merges them
    over the defaults defined in Constitution 2.2.

    Returns:
        UserConfig dictionary with merged configuration.
    """
    # Start with defaults
    config: dict[str, Any] = dict(DEFAULT_CONFIG)

    # Get config path
    config_path = get_config_path()

    # Load and merge if file exists
    if config_path.exists():
        try:
            with open(config_path, encoding="utf-8") as f:
                loaded_config = json.load(f)
                # Merge loaded config over defaults
                config.update(loaded_config)
        except (json.JSONDecodeError, OSError) as e:
            # If there's an error, return defaults
            print(f"Warning: Failed to load config from {config_path}: {e}")

    return cast(UserConfig, config)


def get_config_value(key: str) -> Any:
    """Get a specific configuration value.

    Args:
        key: Configuration key to retrieve.

    Returns:
        The configuration value for the key, or None if not found.
    """
    config = load_config()
    return config.get(key)
