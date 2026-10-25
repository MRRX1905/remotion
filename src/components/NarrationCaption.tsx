import {interpolate, useCurrentFrame} from "remotion";
import {FONT_BODY} from "../fonts";
import {COLORS, clamp} from "../theme";

// The narration text as a glass pill. Reads as a subtitle for sound-off viewers
// while the kinetic headline above carries the punchline.
export const NarrationCaption: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [6, 22], [44, 0], clamp);
  const opacity = interpolate(frame, [6, 20], [0, 1], clamp);

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "stretch",
        padding: "30px 34px",
        borderRadius: 30,
        backgroundColor: "rgba(10,10,13,0.58)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
        opacity,
        transform: `translateY(${rise}px)`,
      }}
    >
      <div
        style={{
          width: 6,
          borderRadius: 4,
          flexShrink: 0,
          background: `linear-gradient(180deg, ${COLORS.accent}, ${COLORS.accentSoft})`,
        }}
      />
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 38,
          fontWeight: 500,
          lineHeight: 1.34,
          color: COLORS.white,
        }}
      >
        {text}
      </div>
    </div>
  );
};
