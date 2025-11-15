"""Configuration fixtures for tests."""

DEFAULT_CONFIG = {
    "language": "en",
    "response_style": "concise",
    "persona": "jarvis",
    "auto_capture": True,
    "checkpoint_before_risky": True,
}

VERBOSE_CONFIG = {
    **DEFAULT_CONFIG,
    "response_style": "verbose",
    "auto_capture": False,
}

MINIMAL_CONFIG = {
    "language": "en",
    "persona": "jarvis",
}
