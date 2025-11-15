"""
ErrorHandler - Centralized error handling for JARVIS MCP tools

Provides consistent error handling with:
- Structured error responses
- Detailed logging for debugging
- Error context preservation
- Graceful degradation
"""

from typing import Any, Callable, TypeVar, cast
import logging
import traceback
from functools import wraps

from ..core.errors import (
    JarvisError,
    ValidationError,
    DatabaseError,
    MCPToolError,
    InternalError,
)

T = TypeVar("T")

logger = logging.getLogger(__name__)


class ErrorHandler:
    """
    Centralized error handler for MCP tools.
    
    Provides consistent error handling with structured responses and logging.
    """

    def __init__(self, logger: logging.Logger | None = None) -> None:
        """
        Initialize error handler.
        
        Args:
            logger: Logger instance to use (defaults to module logger)
        """
        self.logger = logger or logging.getLogger(__name__)

    def handle(
        self,
        error: Exception,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Handle an error and return structured response.
        
        Args:
            error: Error to handle
            context: Additional context information
            
        Returns:
            Structured error response for MCP protocol
        """
        # Normalize to JarvisError
        jarvis_error = self._normalize_error(error, context)

        # Log the error
        self._log_error(jarvis_error)

        # Return structured response
        return {
            "success": False,
            "error": jarvis_error.to_dict(),
        }

    def handle_with_recovery(
        self,
        error: Exception,
        recovery: Callable[[], T],
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any] | T:
        """
        Handle error with optional recovery function.
        
        Args:
            error: Error to handle
            recovery: Recovery function to try
            context: Additional context
            
        Returns:
            Recovery result or error response
        """
        jarvis_error = self._normalize_error(error, context)
        self._log_error(jarvis_error)

        # Try recovery
        try:
            self.logger.info(f"Attempting error recovery for {jarvis_error.code}")
            return recovery()
        except Exception as recovery_error:
            self.logger.error(f"Recovery failed: {recovery_error}")
            return {
                "success": False,
                "error": jarvis_error.to_dict(),
            }

    def wrap(
        self,
        context: dict[str, Any] | None = None,
    ) -> Callable[[Callable[..., T]], Callable[..., T]]:
        """
        Decorator to wrap functions with error handling.
        
        Args:
            context: Additional context for errors
            
        Returns:
            Decorator function
            
        Example:
            @error_handler.wrap(context={"tool": "remember"})
            def remember_context(content: str) -> dict:
                ...
        """

        def decorator(func: Callable[..., T]) -> Callable[..., T]:
            @wraps(func)
            def wrapper(*args: Any, **kwargs: Any) -> T:
                try:
                    return func(*args, **kwargs)
                except Exception as error:
                    result = self.handle(error, context)
                    # Return error response instead of raising
                    return cast(T, result)

            return wrapper

        return decorator

    def _normalize_error(
        self,
        error: Exception,
        context: dict[str, Any] | None = None,
    ) -> JarvisError:
        """
        Normalize any exception to JarvisError.
        
        Args:
            error: Exception to normalize
            context: Additional context
            
        Returns:
            JarvisError instance
        """
        # Already a JarvisError
        if isinstance(error, JarvisError):
            if context:
                error.context.update(context)
            return error

        # Known error types
        error_context = context or {}
        error_context["original_error"] = str(error)
        error_context["error_type"] = type(error).__name__

        # Create appropriate JarvisError
        return InternalError(
            str(error),
            context=error_context,
        )

    def _log_error(self, error: JarvisError) -> None:
        """
        Log error with appropriate level.
        
        Args:
            error: Error to log
        """
        log_context = {
            "code": error.code,
            "context": error.context,
        }

        if self._is_critical(error):
            self.logger.error(error.message, extra=log_context, exc_info=True)
        elif self._is_warning(error):
            self.logger.warning(error.message, extra=log_context)
        else:
            self.logger.info(error.message, extra=log_context)

    def _is_critical(self, error: JarvisError) -> bool:
        """
        Check if error is critical.
        
        Args:
            error: Error to check
            
        Returns:
            True if critical
        """
        critical_codes = {
            "INTERNAL_ERROR",
            "DATABASE_ERROR",
            "MCP_TOOL_ERROR",
        }
        return error.code in critical_codes

    def _is_warning(self, error: JarvisError) -> bool:
        """
        Check if error is a warning.
        
        Args:
            error: Error to check
            
        Returns:
            True if warning
        """
        warning_codes = {
            "VALIDATION_ERROR",
        }
        return error.code in warning_codes


def create_error_handler(logger: logging.Logger | None = None) -> ErrorHandler:
    """
    Create error handler instance.
    
    Args:
        logger: Logger instance to use
        
    Returns:
        ErrorHandler instance
    """
    return ErrorHandler(logger)


# Global error handler instance
error_handler = ErrorHandler()
