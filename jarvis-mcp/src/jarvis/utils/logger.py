"""
Logger - Structured logging for JARVIS MCP server

Provides:
- Multiple log levels (debug, info, warn, error)
- Structured context logging
- JSON and text output formats
- File and console handlers
"""

import logging
import json
import sys
from pathlib import Path
from typing import Any
from logging.handlers import RotatingFileHandler


class StructuredFormatter(logging.Formatter):
    """
    Custom formatter that outputs structured JSON logs.
    """

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON.
        
        Args:
            record: Log record to format
            
        Returns:
            JSON formatted log string
        """
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Add extra context if available
        if hasattr(record, "context"):
            log_data["context"] = record.context

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


class ColoredFormatter(logging.Formatter):
    """
    Formatter that adds color to console output.
    """

    COLORS = {
        "DEBUG": "\x1b[36m",  # Cyan
        "INFO": "\x1b[32m",  # Green
        "WARNING": "\x1b[33m",  # Yellow
        "ERROR": "\x1b[31m",  # Red
        "CRITICAL": "\x1b[35m",  # Magenta
    }
    RESET = "\x1b[0m"
    DIM = "\x1b[2m"

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record with colors.
        
        Args:
            record: Log record to format
            
        Returns:
            Colored log string
        """
        # Colorize level name
        level_color = self.COLORS.get(record.levelname, "")
        record.levelname = f"{level_color}{record.levelname}{self.RESET}"

        # Format message
        formatted = super().format(record)

        # Add context if available
        if hasattr(record, "context") and record.context:
            context_str = json.dumps(record.context, indent=2)
            formatted += f"\n{self.DIM}{context_str}{self.RESET}"

        return formatted


def setup_logger(
    name: str,
    level: str = "INFO",
    log_file: Path | None = None,
    use_json: bool = False,
    colorize: bool = True,
) -> logging.Logger:
    """
    Set up logger with handlers.
    
    Args:
        name: Logger name
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional file path for file logging
        use_json: Whether to use JSON format
        colorize: Whether to colorize console output
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)

    if use_json:
        console_formatter = StructuredFormatter()
    else:
        if colorize and sys.stdout.isatty():
            console_formatter = ColoredFormatter(
                "%(asctime)s [%(levelname)s] %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        else:
            console_formatter = logging.Formatter(
                "%(asctime)s [%(levelname)s] %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )

    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # File handler (always JSON format)
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5,
        )
        file_handler.setLevel(logging.DEBUG)
        file_formatter = StructuredFormatter()
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    return logger


class LoggerAdapter(logging.LoggerAdapter):
    """
    Logger adapter that adds structured context to all log messages.
    """

    def process(
        self,
        msg: str,
        kwargs: dict[str, Any],
    ) -> tuple[str, dict[str, Any]]:
        """
        Process log message to add context.
        
        Args:
            msg: Log message
            kwargs: Log kwargs
            
        Returns:
            Processed message and kwargs
        """
        # Extract extra context
        extra = kwargs.get("extra", {})

        # Merge with adapter context
        if self.extra:
            extra.update(self.extra)

        # Add context to record
        kwargs["extra"] = {"context": extra}

        return msg, kwargs


def get_logger(
    name: str,
    context: dict[str, Any] | None = None,
) -> logging.Logger | LoggerAdapter:
    """
    Get logger with optional context.
    
    Args:
        name: Logger name
        context: Optional context to add to all log messages
        
    Returns:
        Logger or LoggerAdapter instance
    """
    logger = logging.getLogger(name)

    if context:
        return LoggerAdapter(logger, context)

    return logger


# Default logger
default_logger = setup_logger("jarvis")
