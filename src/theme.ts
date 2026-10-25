// Shared design tokens. Kept in one place so the whole video can be restyled
// without touching component logic.

export const COLORS = {
  ink: "#08080A",
  white: "#FFFFFF",
  accent: "#FF6B2C",
  accentSoft: "#FFC14D",
  muted: "rgba(255,255,255,0.72)",
  faint: "rgba(255,255,255,0.38)",
};

export const SAFE_X = 92; // horizontal safe margin; keeps text clear of platform UI

// Crossfade length between scenes, in frames.
export const TRANSITION_FRAMES = 15;

// How long the last narration line stays on screen after its audio ends,
// before the outro card takes over.
export const LAST_LINE_HOLD_FRAMES = 24;

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
