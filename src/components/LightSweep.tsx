import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {clamp} from "../theme";

// A soft diagonal band of light drifting across the frame once per scene.
// Cheap to render and it stops flat photos from looking static.
export const LightSweep: React.FC<{durationInFrames: number}> = ({durationInFrames}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, Math.max(durationInFrames - 1, 1)], [0, 1], clamp);
  const left = -70 + progress * 190;

  return (
    <AbsoluteFill style={{overflow: "hidden"}}>
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: `${left}%`,
          width: "52%",
          height: "165%",
          transform: "rotate(17deg)",
          filter: "blur(38px)",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.13) 48%, rgba(255,255,255,0) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
