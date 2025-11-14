"""JARVIS persona formatter for consistent communication style.

Implements the JARVIS MCU character persona:
- English only
- Concise, professional tone
- Addresses user as "Sir"
- Calm and helpful in errors
"""

from typing import Any


class JarvisPersona:
    """JARVIS persona formatter following MCU character style."""

    # Common response templates
    TEMPLATES = {
        "success": "Done, Sir.",
        "success_with_detail": "{detail}, Sir.",
        "error": "I apologize, Sir. {error}",
        "progress": "{message}",
        "confirmation": "Understood, Sir. {action}",
        "warning": "Sir, {warning}",
        "info": "{info}",
    }

    @staticmethod
    def format_response(
        message: str,
        response_type: str = "info",
        address_sir: bool = True,
        **kwargs: Any,
    ) -> str:
        """Format response with JARVIS persona.

        Args:
            message: The message to format.
            response_type: Type of response (success, error, progress, etc.).
            address_sir: Whether to include "Sir" in response.
            **kwargs: Additional formatting arguments.

        Returns:
            Formatted response string.
        """
        # Ensure message is in English (basic check)
        message = JarvisPersona.ensure_english(message)

        # Get template
        template = JarvisPersona.TEMPLATES.get(response_type, "{message}")

        # Format with template
        if response_type == "success" and message:
            formatted = JarvisPersona.TEMPLATES["success_with_detail"].format(
                detail=message
            )
        elif response_type == "error":
            formatted = template.format(error=message)
        elif response_type == "warning":
            formatted = template.format(warning=message)
        elif response_type == "info":
            formatted = message if not address_sir else f"{message}, Sir."
        elif response_type == "confirmation":
            formatted = template.format(action=message)
        elif response_type == "progress":
            formatted = message
        else:
            formatted = message

        return formatted

    @staticmethod
    def address_as_sir(message: str, always: bool = True) -> str:
        """Ensure message addresses user as "Sir".

        Args:
            message: Message to format.
            always: If True, always add "Sir". If False, only add if not present.

        Returns:
            Message with "Sir" address.
        """
        # Check if "Sir" already in message
        if "Sir" in message and not always:
            return message

        # Add "Sir" at appropriate location
        # If message ends with punctuation, insert before it
        if message and message[-1] in ".!?":
            return f"{message[:-1]}, Sir{message[-1]}"

        return f"{message}, Sir."

    @staticmethod
    def ensure_english(text: str) -> str:
        """Ensure text is in English (basic validation).

        Args:
            text: Text to validate.

        Returns:
            Original text (this is a placeholder for language detection).

        Note:
            Full language detection would require additional libraries.
            For now, we just return the original text and rely on
            the system prompt to enforce English responses.
        """
        # Placeholder: In production, you might use langdetect or similar
        # For now, we assume all responses are in English
        return text

    @staticmethod
    def format_success(detail: str | None = None) -> str:
        """Format success message.

        Args:
            detail: Optional detail to include.

        Returns:
            Formatted success message.
        """
        if detail:
            return JarvisPersona.format_response(detail, "success_with_detail")
        return JarvisPersona.TEMPLATES["success"]

    @staticmethod
    def format_error(error: str, calm: bool = True) -> str:
        """Format error message with calm tone.

        Args:
            error: Error message.
            calm: If True, use calm, professional tone.

        Returns:
            Formatted error message.
        """
        if calm:
            # Remove aggressive language
            error = error.replace("Error:", "").replace("ERROR:", "").strip()
            error = error.replace("failed", "was unsuccessful")
            error = error.replace("Failed", "Was unsuccessful")

        return JarvisPersona.format_response(error, "error")

    @staticmethod
    def format_list(
        items: list[str], prefix: str | None = None, numbered: bool = False
    ) -> str:
        """Format list of items in concise style.

        Args:
            items: List of items to format.
            prefix: Optional prefix before list.
            numbered: If True, use numbered list. Otherwise use bullets.

        Returns:
            Formatted list string.
        """
        if not items:
            return ""

        # Create list
        if numbered:
            lines = [f"{i+1}. {item}" for i, item in enumerate(items)]
        else:
            lines = [f"• {item}" for item in items]

        result = "\n".join(lines)

        if prefix:
            result = f"{prefix}\n{result}"

        return result

    @staticmethod
    def format_table(
        headers: list[str], rows: list[list[str]], title: str | None = None
    ) -> str:
        """Format data as a simple table.

        Args:
            headers: Column headers.
            rows: Table rows.
            title: Optional title for table.

        Returns:
            Formatted table string.
        """
        if not headers or not rows:
            return ""

        # Calculate column widths
        col_widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                if i < len(col_widths):
                    col_widths[i] = max(col_widths[i], len(str(cell)))

        # Format header
        header_line = " | ".join(
            h.ljust(col_widths[i]) for i, h in enumerate(headers)
        )
        separator = "-+-".join("-" * w for w in col_widths)

        # Format rows
        row_lines = []
        for row in rows:
            row_line = " | ".join(
                str(cell).ljust(col_widths[i]) for i, cell in enumerate(row)
            )
            row_lines.append(row_line)

        # Combine
        table_parts = [header_line, separator] + row_lines
        table = "\n".join(table_parts)

        if title:
            table = f"{title}\n{table}"

        return table

    @staticmethod
    def format_progress(current: int, total: int, task: str = "") -> str:
        """Format progress message.

        Args:
            current: Current progress count.
            total: Total count.
            task: Optional task description.

        Returns:
            Formatted progress message.
        """
        percentage = (current / total * 100) if total > 0 else 0
        progress_msg = f"Progress: {current}/{total} ({percentage:.0f}%)"

        if task:
            progress_msg = f"{progress_msg} - {task}"

        return progress_msg

    @staticmethod
    def format_json_response(data: dict[str, Any], verbose: bool = False) -> str:
        """Format JSON data for response.

        Args:
            data: Data to format.
            verbose: If True, use pretty formatting. Otherwise, compact.

        Returns:
            Formatted JSON string.
        """
        import json

        if verbose:
            return json.dumps(data, indent=2, ensure_ascii=False)
        return json.dumps(data, ensure_ascii=False)


# Convenience functions
def format_response(message: str, response_type: str = "info", **kwargs: Any) -> str:
    """Convenience wrapper for JarvisPersona.format_response."""
    return JarvisPersona.format_response(message, response_type, **kwargs)


def format_success(detail: str | None = None) -> str:
    """Convenience wrapper for JarvisPersona.format_success."""
    return JarvisPersona.format_success(detail)


def format_error(error: str, calm: bool = True) -> str:
    """Convenience wrapper for JarvisPersona.format_error."""
    return JarvisPersona.format_error(error, calm)


def address_as_sir(message: str) -> str:
    """Convenience wrapper for JarvisPersona.address_as_sir."""
    return JarvisPersona.address_as_sir(message)


def ensure_english(text: str) -> str:
    """Convenience wrapper for JarvisPersona.ensure_english."""
    return JarvisPersona.ensure_english(text)
