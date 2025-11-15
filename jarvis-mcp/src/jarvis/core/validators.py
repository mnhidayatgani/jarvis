"""Pydantic validators for runtime validation."""

from typing import Literal

from pydantic import BaseModel, field_validator


class ProjectConfig(BaseModel):
    """Project-specific JARVIS configuration."""

    language: Literal["en"] = "en"
    response_style: Literal["concise", "verbose"] = "concise"
    persona: Literal["jarvis"] = "jarvis"
    auto_capture: bool = True
    checkpoint_before_risky: bool = True

    model_config = {"frozen": False, "extra": "forbid"}

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        if v != "en":
            raise ValueError("Only English ('en') is supported")
        return v

    @field_validator("response_style")
    @classmethod
    def validate_response_style(cls, v: str) -> str:
        """Validate response_style value.

        Args:
            v: Proposed response style

        Returns:
            Validated value

        Raises:
            ValueError: If response style not supported
        """
        if v not in ("concise", "verbose"):
            raise ValueError("response_style must be 'concise' or 'verbose'")
        return v

    @field_validator("persona")
    @classmethod
    def validate_persona(cls, v: str) -> str:
        """Validate persona value.

        Currently only 'jarvis' persona is supported.
        """
        if v != "jarvis":
            raise ValueError("Only 'jarvis' persona is supported")
        return v


__all__ = ["ProjectConfig"]
