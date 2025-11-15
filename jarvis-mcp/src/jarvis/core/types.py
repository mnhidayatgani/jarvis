"""Core type definitions and Pydantic models."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class MemoryEntry(BaseModel):
    """Memory entry data model with validation."""

    id: str = Field(description="Unique entry ID")
    content: str = Field(
        min_length=1, max_length=10000, description="Entry content"
    )
    type: Literal["decision", "note", "context"] = Field(description="Entry type")
    tags: list[str] = Field(default_factory=list, description="Tags (max 10)")
    file_path: str | None = Field(default=None, description="Associated file")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata"
    )

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, v: list[str]) -> list[str]:
        """Normalize tags to lowercase and remove duplicates."""
        return list(set(tag.lower().strip() for tag in v if tag.strip()))

    @field_validator("tags")
    @classmethod
    def limit_tags(cls, v: list[str]) -> list[str]:
        """Ensure maximum 10 tags."""
        if len(v) > 10:
            raise ValueError("Maximum 10 tags allowed")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        """Validate content is not empty after stripping."""
        content = v.strip()
        if not content:
            raise ValueError("Content cannot be empty")
        return content


class SearchResult(BaseModel):
    """Search result with relevance score."""

    entry: MemoryEntry
    score: float = Field(ge=0.0, le=1.0, description="Relevance score 0-1")
    highlights: list[str] = Field(
        default_factory=list, description="Highlighted matches"
    )

    model_config = {"frozen": True}  # Immutable


__all__ = ["MemoryEntry", "SearchResult"]
