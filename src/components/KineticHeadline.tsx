import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {FONT_DISPLAY} from "../fonts";
import {COLORS, clamp} from "../theme";

// Words rise and settle one after another. The very last word is painted in the
// accent colour so each scene has a single focal point.
export const KineticHeadline: React.FC<{
  lines: string[];
  startDelay?: number;
  fontSize?: number;
}> = ({lines, startDelay = 0, fontSize = 106}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const totalWords = lines.reduce((sum, line) => sum + line.split(" ").length, 0);
  let wordIndex = 0;

  return (
    <div style={{display: "flex", flexDirection: "column"}}>
      {lines.map((lineText, lineIdx) => (
        <div
          key={lineText + lineIdx}
          style={{display: "flex", flexWrap: "wrap", columnGap: 26, rowGap: 0}}
        >
          {lineText.split(" ").map((word) => {
            const i = wordIndex++;
            const delay = startDelay + i * 4;
            const local = frame - delay;

            const enter =
              local < 0
                ? 0
                : spring({frame: local, fps, config: {damping: 200, mass: 0.6, stiffness: 110}});
            const opacity = interpolate(local, [0, 7], [0, 1], clamp);

            return (
              <span
                key={word + i}
                style={{
                  display: "inline-block",
                  fontFamily: FONT_DISPLAY,
                  fontSize,
                  lineHeight: 0.94,
                  letterSpacing: -1,
                  color: i === totalWords - 1 ? COLORS.accent : COLORS.white,
                  textShadow: "0 10px 46px rgba(0,0,0,0.72)",
                  opacity,
                  transform: `translateY(${(1 - enter) * 74}px)`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// A short accent rule that wipes in after the headline has landed.
export const AccentRule: React.FC<{startDelay?: number}> = ({startDelay = 16}) => {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [startDelay, startDelay + 16], [0, 168], clamp);

  return (
    <div
      style={{
        width,
        height: 7,
        borderRadius: 4,
        background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentSoft})`,
        boxShadow: `0 0 26px rgba(255,107,44,0.55)`,
      }}
    />
  );
};
