/**
 * Test fixtures for configuration objects
 */

export const mockGlobalConfig = {
  language: "en" as const,
  responseStyle: "concise" as const,
  persona: "jarvis" as const,
};

export const mockProjectConfig = {
  ...mockGlobalConfig,
  autoCapture: true,
  checkpointBeforeRisky: true,
  initialized_at: "2025-11-15T00:00:00Z",
};

export const mockVerboseConfig = {
  ...mockGlobalConfig,
  responseStyle: "verbose" as const,
  autoCapture: false,
  checkpointBeforeRisky: false,
};
