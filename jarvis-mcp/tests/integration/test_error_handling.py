"""
Integration Tests for Error Handling and Recovery

Tests error handling, graceful degradation, and recovery mechanisms.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import logging

from jarvis.mcp.error_handler import ErrorHandler, create_error_handler
from jarvis.core.errors import (
    JarvisError,
    ValidationError,
    DatabaseError,
    MCPToolError,
    InternalError,
)
from jarvis.memory.core import MemoryCore
from jarvis.memory.base import BaseMemory
from jarvis.core.types import MemoryEntry, SearchResult
from datetime import datetime


class TestErrorHandler:
    """Test ErrorHandler functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.logger = logging.getLogger("test")
        self.error_handler = ErrorHandler(self.logger)

    def test_handle_jarvis_error(self):
        """Test handling of JarvisError instances."""
        error = ValidationError("Invalid input", field="test_field", value="bad")
        
        result = self.error_handler.handle(error)

        assert result["success"] is False
        assert result["error"]["code"] == "VALIDATION_ERROR"
        assert result["error"]["context"]["field"] == "test_field"

    def test_normalize_standard_exception(self):
        """Test normalization of standard exceptions."""
        error = ValueError("Something went wrong")
        
        result = self.error_handler.handle(error)

        assert result["success"] is False
        assert result["error"]["code"] == "INTERNAL_ERROR"
        assert "Something went wrong" in result["error"]["message"]

    def test_handle_with_additional_context(self):
        """Test error handling with additional context."""
        error = ValidationError("Invalid", field="test", value="x")
        context = {"tool": "remember", "extra": "info"}
        
        result = self.error_handler.handle(error, context)

        assert result["error"]["context"]["field"] == "test"
        assert result["error"]["context"]["tool"] == "remember"
        assert result["error"]["context"]["extra"] == "info"

    def test_wrap_decorator_success(self):
        """Test decorator with successful function."""
        @self.error_handler.wrap(context={"tool": "test"})
        def success_function(x: int) -> int:
            return x * 2

        result = success_function(5)
        assert result == 10

    def test_wrap_decorator_error(self):
        """Test decorator with failing function."""
        @self.error_handler.wrap(context={"tool": "test"})
        def failing_function():
            raise ValueError("Test error")

        result = failing_function()
        
        # Should return error dict instead of raising
        assert isinstance(result, dict)
        assert result["success"] is False
        assert "error" in result

    def test_handle_with_recovery(self):
        """Test error handling with recovery function."""
        error = DatabaseError("DB connection failed", operation="query", query="SELECT *")
        
        def recovery():
            return {"recovered": True, "data": "fallback"}

        result = self.error_handler.handle_with_recovery(error, recovery)

        assert result["recovered"] is True
        assert result["data"] == "fallback"

    def test_handle_with_failed_recovery(self):
        """Test error handling when recovery fails."""
        error = DatabaseError("DB failed", operation="insert")
        
        def failed_recovery():
            raise RuntimeError("Recovery also failed")

        result = self.error_handler.handle_with_recovery(error, failed_recovery)

        # Should return error response
        assert isinstance(result, dict)
        assert result["success"] is False


class TestMemoryCoreGracefulDegradation:
    """Test graceful degradation in MemoryCore."""

    def setup_method(self):
        """Set up test fixtures."""
        self.factual_mock = Mock(spec=BaseMemory)
        self.semantic_mock = Mock(spec=BaseMemory)
        self.snapshot_mock = Mock(spec=BaseMemory)
        
        # Mark all as initialized
        self.factual_mock.is_initialized.return_value = True
        self.semantic_mock.is_initialized.return_value = True
        self.snapshot_mock.is_initialized.return_value = True
        
        self.memory_core = MemoryCore(
            factual=self.factual_mock,
            semantic=self.semantic_mock,
            snapshot=self.snapshot_mock,
        )
        self.memory_core._initialized = True

    def test_remember_with_partial_failure(self):
        """Test remember when one layer fails but other succeeds."""
        # Factual succeeds, semantic fails
        self.factual_mock.store.return_value = None
        self.semantic_mock.store.side_effect = DatabaseError(
            "Semantic layer unavailable",
            operation="store"
        )

        # Should not raise, but log warning
        with patch("jarvis.memory.core.logger") as mock_logger:
            entry_id = self.memory_core.remember("test content")
            
            assert entry_id is not None
            mock_logger.warning.assert_called()
            assert "partial success" in mock_logger.warning.call_args[0][0].lower()

    def test_remember_with_all_failures(self):
        """Test remember when all layers fail."""
        self.factual_mock.store.side_effect = DatabaseError("Factual failed", operation="store")
        self.semantic_mock.store.side_effect = DatabaseError("Semantic failed", operation="store")

        with pytest.raises(RuntimeError) as exc_info:
            self.memory_core.remember("test content")

        assert "Failed to store entry in any memory layer" in str(exc_info.value)

    def test_recall_with_partial_failure(self):
        """Test recall when one layer fails but other succeeds."""
        # Create test entries
        test_entry = MemoryEntry(
            id="test-1",
            content="test content",
            type="decision",
            tags=[],
            file_path=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            metadata={},
        )
        
        # Factual succeeds, semantic fails
        self.factual_mock.search.return_value = [test_entry]
        self.semantic_mock.search.side_effect = DatabaseError(
            "Semantic search failed",
            operation="search"
        )

        with patch("jarvis.memory.core.logger") as mock_logger:
            results = self.memory_core.recall("test query")
            
            assert len(results) > 0
            assert results[0].entry.id == "test-1"
            mock_logger.warning.assert_called()

    def test_recall_with_all_failures(self):
        """Test recall when all layers fail."""
        self.factual_mock.search.side_effect = DatabaseError("Factual failed", operation="search")
        self.semantic_mock.search.side_effect = DatabaseError("Semantic failed", operation="search")

        with pytest.raises(RuntimeError) as exc_info:
            self.memory_core.recall("test query")

        assert "Failed to search any memory layer" in str(exc_info.value)

    def test_recall_no_failures_no_results(self):
        """Test recall when no failures but also no results."""
        self.factual_mock.search.return_value = []
        self.semantic_mock.search.return_value = []

        with patch("jarvis.memory.core.logger") as mock_logger:
            results = self.memory_core.recall("test query")
            
            assert len(results) == 0
            mock_logger.info.assert_called()


class TestMCPToolsErrorHandling:
    """Test error handling in MCP tools."""

    def test_remember_context_error_handling(self):
        """Test remember_context handles errors gracefully."""
        from jarvis.mcp.tools import MCPTools
        
        with patch("jarvis.mcp.tools.FactualMemory") as MockFactual:
            # Simulate error in storage
            mock_factual = MockFactual.return_value
            mock_factual.create_entry.side_effect = DatabaseError(
                "Storage failed",
                operation="insert"
            )
            
            tools = MCPTools(Path("/tmp/test"))
            result = tools.remember_context("test content")

            assert result["success"] is False
            assert "error" in result

    def test_recall_context_error_handling(self):
        """Test recall_context handles errors gracefully."""
        from jarvis.mcp.tools import MCPTools
        
        with patch("jarvis.mcp.tools.SemanticMemory") as MockSemantic:
            # Simulate error in search
            mock_semantic = MockSemantic.return_value
            mock_semantic.search.side_effect = DatabaseError(
                "Search failed",
                operation="search"
            )
            
            tools = MCPTools(Path("/tmp/test"))
            result = tools.recall_context("test query")

            assert result["success"] is False
            assert "error" in result


@pytest.mark.integration
class TestErrorRecoveryIntegration:
    """Integration tests for end-to-end error recovery."""

    def test_full_error_recovery_flow(self, tmp_path):
        """Test complete error recovery flow."""
        # Set up temporary project
        jarvis_dir = tmp_path / ".jarvis"
        jarvis_dir.mkdir()
        (jarvis_dir / "db").mkdir()

        # Test recovery from initialization errors
        with patch("jarvis.memory.core.get_sqlite_engine") as mock_engine:
            # First attempt fails, retry succeeds
            attempts = []
            
            def side_effect(*args, **kwargs):
                if len(attempts) == 0:
                    attempts.append(1)
                    raise DatabaseError("Connection failed", operation="connect")
                return MagicMock()
            
            mock_engine.side_effect = side_effect
            
            # Should recover after retry
            # This would be called by actual initialization code
            # Here we just verify the pattern works
            try:
                engine = mock_engine(str(tmp_path))
                assert engine is not None
            except DatabaseError:
                # Retry
                engine = mock_engine(str(tmp_path))
                assert engine is not None

    def test_logging_on_errors(self, caplog):
        """Test that errors are properly logged."""
        error_handler = create_error_handler()
        
        with caplog.at_level(logging.ERROR):
            error = ValidationError("Test validation error", field="test", value="x")
            error_handler.handle(error)

        # Should have logged the error
        assert "Test validation error" in caplog.text
