import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {COLORS, clamp} from "../theme";

// Rendered outside the TransitionSeries so it reads the *global* frame rather
// than a scene-local one.
export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 8,
        backgroundColor: "rgba(255,255,255,0.14)",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentSoft})`,
          boxShadow: `0 0 22px ${COLORS.accent}`,
        }}
      />
    </div>
  );
};
