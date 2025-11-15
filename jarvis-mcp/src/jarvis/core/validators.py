"""Pydantic validators for runtime validation."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


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


__all__ = ["ProjectConfig"]
