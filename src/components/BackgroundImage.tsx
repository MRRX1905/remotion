import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from "remotion";
import {COLORS, clamp} from "../theme";

// Full-bleed photo with a slow Ken Burns push. Two stacked scrims keep the
// text legible no matter how bright the underlying photo is: a vertical
// gradient for the caption band plus a radial vignette.
export const BackgroundImage: React.FC<{
  src: string;
  alt: string;
  durationInFrames: number;
  seed?: number;
}> = ({src, alt, durationInFrames, seed = 0}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, Math.max(durationInFrames - 1, 1)], [0, 1], clamp);

  const scale = 1.08 + progress * 0.14;
  const direction = seed % 2 === 0 ? -1 : 1;
  const shiftX = direction * (progress - 0.5) * 44;
  const shiftY = (progress - 0.5) * 34;

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.ink, overflow: "hidden"}}>
      <AbsoluteFill style={{transform: `scale(${scale}) translate(${shiftX}px, ${shiftY}px)`}}>
        <Img
          src={staticFile(src)}
          alt={alt}
          style={{width: "100%", height: "100%", objectFit: "cover"}}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,8,10,0.86) 0%, rgba(8,8,10,0.42) 26%, rgba(8,8,10,0.52) 58%, rgba(8,8,10,0.94) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(125% 78% at 50% 44%, rgba(8,8,10,0) 26%, rgba(8,8,10,0.82) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
