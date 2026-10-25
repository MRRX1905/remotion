import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import type {SceneImage} from "../asset-data";
import {FONT_BODY} from "../fonts";
import {COLORS, SAFE_X, clamp} from "../theme";
import type {VoiceoverLine} from "../voiceover-data";
import {BackgroundImage} from "./BackgroundImage";
import {LightSweep} from "./LightSweep";
import {AccentRule, KineticHeadline} from "./KineticHeadline";
import {NarrationCaption} from "./NarrationCaption";

// Secondary line under the headline: the softer, human restatement of the beat.
const Emphasis: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const delay = 26;
  const opacity = interpolate(frame, [delay, delay + 14], [0, 1], clamp);
  const y = interpolate(frame, [delay, delay + 18], [28, 0], clamp);

  return (
    <div
      style={{
        fontFamily: FONT_BODY,
        fontSize: 40,
        fontWeight: 600,
        lineHeight: 1.3,
        color: "rgba(255,255,255,0.88)",
        maxWidth: 860,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {text}
    </div>
  );
};

export const NarrationScene: React.FC<{
  line: VoiceoverLine;
  image: SceneImage;
  index: number;
  total: number;
  durationInFrames: number;
}> = ({line, image, index, total, durationInFrames}) => {
  return (
    <AbsoluteFill>
      <BackgroundImage
        src={image.file}
        alt={image.alt}
        durationInFrames={durationInFrames}
        seed={index}
      />
      <LightSweep durationInFrames={durationInFrames} />

      <AbsoluteFill style={{padding: `128px ${SAFE_X}px 128px`}}>
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
              {line.kicker} / {String(total).padStart(2, "0")}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 36,
            }}
          >
            <KineticHeadline lines={line.headline} />
            <AccentRule />
            <Emphasis text={line.emphasis} />
          </div>

          <NarrationCaption text={line.text} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
