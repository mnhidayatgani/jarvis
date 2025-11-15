"""JARVIS Error Hierarchy

Custom exception classes for structured error handling.
"""

from typing import Any


class JarvisError(Exception):
    """Base exception for all JARVIS errors."""

    def __init__(
        self,
        message: str,
        code: str,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.context = context or {}
        self.__cause__ = cause

    def to_dict(self) -> dict[str, Any]:
        """Serialize error for JSON responses."""
        return {
            "error": self.__class__.__name__,
            "code": self.code,
            "message": str(self),
            "context": self.context,
        }

    def to_cli_message(self) -> str:
        """Format error message for CLI display."""
        return f"Error: {self}"


class ValidationError(JarvisError):
    """Raised when input validation fails."""

    def __init__(
        self,
        message: str,
        field: str,
        value: Any,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(
            message, "VALIDATION_ERROR", {"field": field, "value": value}, cause
        )

    def to_cli_message(self) -> str:
        return f"Validation error in {self.context['field']}: {self}"


class MissingFieldError(ValidationError):
    """Raised when required field is missing."""

    def __init__(self, field_name: str) -> None:
        super().__init__(f"Required field '{field_name}' is missing", field_name, None)


class InvalidValueError(ValidationError):
    """Raised when field has invalid value."""

    def __init__(self, field_name: str, value: Any, expected_format: str) -> None:
        super().__init__(
            f"Invalid value for '{field_name}': expected {expected_format}",
            field_name,
            value,
        )
        self.context["expected_format"] = expected_format


class DatabaseError(JarvisError):
    """Raised when database operation fails."""

    def __init__(
        self,
        message: str,
        operation: str,
        query: str | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(
            message, "DATABASE_ERROR", {"operation": operation, "query": query}, cause
        )


class ConnectionError(DatabaseError):
    """Raised when database connection fails."""

    def __init__(
        self, db_type: str, db_path: str, cause: Exception | None = None
    ) -> None:
        super().__init__(
            f"Cannot connect to {db_type} database at {db_path}",
            "connect",
            None,
            cause,
        )
        self.code = "DATABASE_CONNECTION_ERROR"
        self.context.update({"db_type": db_type, "db_path": db_path})


class QueryError(DatabaseError):
    """Raised when database query fails."""

    def __init__(
        self, query: str, error_message: str, cause: Exception | None = None
    ) -> None:
        super().__init__(f"Query failed: {error_message}", "query", query, cause)
        self.code = "DATABASE_QUERY_ERROR"


class MCPToolError(JarvisError):
    """Raised when MCP tool execution fails."""

    def __init__(
        self,
        message: str,
        tool_name: str,
        arguments: dict[str, Any],
        cause: Exception | None = None,
    ) -> None:
        super().__init__(
            message,
            "MCP_TOOL_ERROR",
            {"tool_name": tool_name, "arguments": arguments},
            cause,
        )


class ToolNotFoundError(MCPToolError):
    """Raised when requested tool doesn't exist."""

    def __init__(self, tool_name: str) -> None:
        super().__init__(f"Tool '{tool_name}' not found", tool_name, {})
        self.code = "TOOL_NOT_FOUND"


class ToolExecutionError(MCPToolError):
    """Raised when tool execution fails."""

    def __init__(
        self,
        tool_name: str,
        error_message: str,
        arguments: dict[str, Any],
        cause: Exception | None = None,
    ) -> None:
        super().__init__(
            f"Tool '{tool_name}' execution failed: {error_message}",
            tool_name,
            arguments,
            cause,
        )
        self.code = "TOOL_EXECUTION_ERROR"


class FileSystemError(JarvisError):
    """Raised when filesystem operation fails."""

    def __init__(
        self, message: str, path: str, operation: str, cause: Exception | None = None
    ) -> None:
        super().__init__(
            message, "FILESYSTEM_ERROR", {"path": path, "operation": operation}, cause
        )

    def to_cli_message(self) -> str:
        return f"Cannot {self.context['operation']} '{self.context['path']}': {self}"


class NotInitializedError(FileSystemError):
    """Raised when project not initialized."""

    def __init__(self, project_path: str) -> None:
        super().__init__(
            "Project not initialized. Run 'jarvis init' first.",
            project_path,
            "initialize",
        )
        self.code = "NOT_INITIALIZED"


class InternalError(JarvisError):
    """Raised for unexpected internal errors."""

    def __init__(
        self,
        message: str,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, "INTERNAL_ERROR", context, cause)

    def to_cli_message(self) -> str:
        return f"Internal error: {self}\nPlease report this issue."
