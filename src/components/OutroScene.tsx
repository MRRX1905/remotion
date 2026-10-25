import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {BACKSOUND, type SceneImage} from "../asset-data";
import {FONT_BODY, FONT_DISPLAY} from "../fonts";
import {COLORS, SAFE_X, clamp} from "../theme";
import {BackgroundImage} from "./BackgroundImage";
import {LightSweep} from "./LightSweep";

export const OutroScene: React.FC<{image: SceneImage; durationInFrames: number}> = ({
  image,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({frame, fps, config: {damping: 200, mass: 0.7, stiffness: 110}});
  const glow = 0.55 + Math.sin(frame / 11) * 0.2;

  return (
    <AbsoluteFill>
      <BackgroundImage
        src={image.file}
        alt={image.alt}
        durationInFrames={durationInFrames}
        seed={3}
      />
      <LightSweep durationInFrames={durationInFrames} />

      <AbsoluteFill style={{padding: `128px ${SAFE_X}px 96px`}}>
        <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
          <div style={{display: "flex", alignItems: "center", gap: 18}}>
            <div
              style={{
                width: 58,
                height: 5,
                borderRadius: 3,
                background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentSoft})`,
              }}
            />
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 27,
                fontWeight: 700,
                letterSpacing: 6,
                color: COLORS.accentSoft,
              }}
            >
              SELESAI
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 30,
            }}
          >
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 188,
                lineHeight: 0.9,
                letterSpacing: -2,
                color: COLORS.accent,
                opacity: interpolate(enter, [0, 1], [0, 1]),
                transform: `translateY(${(1 - enter) * 90}px)`,
                textShadow: `0 14px 60px rgba(0,0,0,0.7), 0 0 ${60 * glow}px rgba(255,107,44,${glow})`,
              }}
            >
              MULAI.
            </span>

            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 42,
                fontWeight: 600,
                lineHeight: 1.32,
                color: "rgba(255,255,255,0.9)",
                maxWidth: 820,
                opacity: interpolate(frame, [22, 40], [0, 1], clamp),
                transform: `translateY(${interpolate(frame, [22, 42], [26, 0], clamp)}px)`,
              }}
            >
              Simpan video ini. Tonton lagi besok pagi, lalu kerjakan satu langkah kecilnya.
            </div>
          </div>

          {/* CC-BY music requires a credit; showing it in-frame keeps the video
              compliant wherever it is reposted. */}
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 24,
              fontWeight: 500,
              color: COLORS.faint,
              opacity: interpolate(frame, [30, 46], [0, 1], clamp),
            }}
          >
            ♪ {BACKSOUND.title} — {BACKSOUND.creator} ({BACKSOUND.license})
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
