"""Unit tests for configuration loading.

Tests for US-1.1 Global Configuration.
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, mock_open, patch

from jarvis.utils.config import (
    DEFAULT_CONFIG,
    get_config_path,
    get_config_value,
    load_config,
)


class TestConfigPath:
    """Tests for get_config_path function."""

    def test_get_config_path_returns_path_object(self) -> None:
        """Test that get_config_path returns a Path object."""
        path = get_config_path()
        assert isinstance(path, Path)

    def test_get_config_path_points_to_home_jarvis(self) -> None:
        """Test that config path is in ~/.jarvis/config.json."""
        path = get_config_path()
        assert path.name == "config.json"
        assert path.parent.name == ".jarvis"


class TestLoadConfig:
    """Tests for load_config function."""

    def test_load_config_returns_defaults_when_file_missing(self) -> None:
        """Test that load_config returns defaults when config file doesn't exist."""
        with patch("jarvis.utils.config.get_config_path") as mock_path:
            mock_path_obj = MagicMock(spec=Path)
            mock_path_obj.exists.return_value = False
            mock_path.return_value = mock_path_obj

            config = load_config()

            assert config == DEFAULT_CONFIG
            assert config["language"] == "en"
            assert config["responseStyle"] == "concise"
            assert config["persona"] == "jarvis"

    def test_load_config_reads_existing_file(self) -> None:
        """Test that load_config correctly reads an existing config file."""
        custom_config = {
            "language": "en",
            "responseStyle": "verbose",
            "persona": "jarvis",
        }

        with patch("jarvis.utils.config.get_config_path") as mock_path:
            mock_path_obj = MagicMock(spec=Path)
            mock_path_obj.exists.return_value = True
            mock_path.return_value = mock_path_obj

            with patch("builtins.open", mock_open(read_data=json.dumps(custom_config))):
                config = load_config()

                assert config["language"] == "en"
                assert config["responseStyle"] == "verbose"
                assert config["persona"] == "jarvis"

    def test_load_config_merges_partial_config_over_defaults(self) -> None:
        """Test that load_config merges partial config over defaults."""
        # Partial config only specifies responseStyle
        partial_config = {"responseStyle": "detailed"}

        with patch("jarvis.utils.config.get_config_path") as mock_path:
            mock_path_obj = MagicMock(spec=Path)
            mock_path_obj.exists.return_value = True
            mock_path.return_value = mock_path_obj

            with patch(
                "builtins.open", mock_open(read_data=json.dumps(partial_config))
            ):
                config = load_config()

                # Should have default language and persona
                assert config["language"] == "en"
                assert config["persona"] == "jarvis"
                # Should have custom responseStyle
                assert config["responseStyle"] == "detailed"

    def test_load_config_handles_invalid_json(self) -> None:
        """Test that load_config handles invalid JSON gracefully."""
        with patch("jarvis.utils.config.get_config_path") as mock_path:
            mock_path_obj = MagicMock(spec=Path)
            mock_path_obj.exists.return_value = True
            mock_path.return_value = mock_path_obj

            with patch("builtins.open", mock_open(read_data="invalid json")):
                with patch("builtins.print"):  # Suppress warning output
                    config = load_config()

                # Should return defaults on error
                assert config == DEFAULT_CONFIG

    def test_load_config_handles_io_error(self) -> None:
        """Test that load_config handles I/O errors gracefully."""
        with patch("jarvis.utils.config.get_config_path") as mock_path:
            mock_path_obj = MagicMock(spec=Path)
            mock_path_obj.exists.return_value = True
            mock_path.return_value = mock_path_obj

            with patch("builtins.open", side_effect=OSError("File error")):
                with patch("builtins.print"):  # Suppress warning output
                    config = load_config()

                # Should return defaults on error
                assert config == DEFAULT_CONFIG


class TestGetConfigValue:
    """Tests for get_config_value function."""

    def test_get_config_value_returns_existing_key(self) -> None:
        """Test that get_config_value returns value for existing key."""
        with patch("jarvis.utils.config.load_config") as mock_load:
            mock_load.return_value = DEFAULT_CONFIG.copy()

            value = get_config_value("language")

            assert value == "en"
            mock_load.assert_called_once()

    def test_get_config_value_returns_none_for_missing_key(self) -> None:
        """Test that get_config_value returns None for missing key."""
        with patch("jarvis.utils.config.load_config") as mock_load:
            mock_load.return_value = DEFAULT_CONFIG.copy()

            value = get_config_value("nonexistent")

            assert value is None
            mock_load.assert_called_once()

    def test_get_config_value_returns_custom_value(self) -> None:
        """Test that get_config_value returns custom configured values."""
        custom_config = DEFAULT_CONFIG.copy()
        custom_config["responseStyle"] = "verbose"

        with patch("jarvis.utils.config.load_config") as mock_load:
            mock_load.return_value = custom_config

            value = get_config_value("responseStyle")

            assert value == "verbose"
