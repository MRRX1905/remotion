import {Audio} from "@remotion/media";
import {
  AbsoluteFill,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import {TransitionSeries, linearTiming} from "@remotion/transitions";
import {fade} from "@remotion/transitions/fade";
import {Fragment, useEffect, useMemo, useState} from "react";
import {BACKSOUND, SCENE_IMAGES} from "./asset-data";
import {NarrationScene} from "./components/NarrationScene";
import {OutroScene} from "./components/OutroScene";
import {ProgressBar} from "./components/ProgressBar";
import {waitForFonts} from "./fonts";
import {COLORS, LAST_LINE_HOLD_FRAMES, TRANSITION_FRAMES, clamp} from "./theme";
import {
  LEAD_IN_FRAMES,
  TOTAL_DURATION_IN_FRAMES,
  VOICEOVER,
  type VoiceoverLine,
} from "./voiceover-data";

// Each TransitionSeries.Transition overlaps its neighbours by TRANSITION_FRAMES,
// which shortens the series by that amount per transition. A scene is therefore
// given `window + TRANSITION_FRAMES` so that scene k still *starts* exactly on
// the frame where its narration line starts.
export const MOTIVATION_DURATION = TOTAL_DURATION_IN_FRAMES + TRANSITION_FRAMES;

type SceneSpec = {
  key: string;
  imageIndex: number;
  durationInFrames: number;
  line: VoiceoverLine | null;
};

const buildScenes = (): SceneSpec[] => {
  const last = VOICEOVER[VOICEOVER.length - 1];

  const scenes: SceneSpec[] = VOICEOVER.map((line, i) => {
    const next = VOICEOVER[i + 1];
    const window = next
      ? next.startFrame - line.startFrame
      : line.durationInFrames + LAST_LINE_HOLD_FRAMES;

    return {
      key: line.id,
      imageIndex: i,
      line,
      durationInFrames: window + TRANSITION_FRAMES,
    };
  });

  const outroWindow =
    TOTAL_DURATION_IN_FRAMES - (last.startFrame + last.durationInFrames + LAST_LINE_HOLD_FRAMES);

  scenes.push({
    key: "outro",
    imageIndex: VOICEOVER.length,
    line: null,
    durationInFrames: outroWindow + TRANSITION_FRAMES,
  });

  return scenes;
};

export const Motivation: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  const scenes = useMemo(buildScenes, []);

  // Guard the timeline arithmetic: if the generated voice-over data changes,
  // this fails loudly instead of silently desyncing the audio.
  const visualDuration =
    scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0) -
    (scenes.length - 1) * TRANSITION_FRAMES;
  const expectedDuration = TOTAL_DURATION_IN_FRAMES - LEAD_IN_FRAMES + TRANSITION_FRAMES;

  if (visualDuration !== expectedDuration) {
    throw new Error(
      `Timeline mismatch: the visual timeline is ${visualDuration} frames but the voice-over data ` +
        `expects ${expectedDuration}. Re-run "node tools/generate-voiceover.mjs" after editing the script.`,
    );
  }

  const [fontHandle] = useState(() => delayRender("Loading Google Fonts"));
  useEffect(() => {
    waitForFonts()
      .then(() => continueRender(fontHandle))
      .catch((err) => {
        console.warn("Google Fonts failed to load; falling back to system fonts.", err);
        continueRender(fontHandle);
      });
  }, [fontHandle]);

  // Keep the music well under the narration and fade it at both ends.
  const backingVolume = (frame: number) =>
    Math.min(
      interpolate(frame, [0, 32], [0, 0.17], clamp),
      interpolate(frame, [durationInFrames - 85, durationInFrames - 12], [0.17, 0], clamp),
    );

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.ink}}>
      <Audio
        src={staticFile(BACKSOUND.file)}
        loop
        loopVolumeCurveBehavior="extend"
        volume={backingVolume}
      />

      {/* Narration is placed on absolute frames outside the TransitionSeries so
          the audio never drifts when transition timings change. */}
      {VOICEOVER.map((line) => (
        <Sequence key={line.id} from={line.startFrame}>
          <Audio src={staticFile(line.audioSrc)} volume={1} />
        </Sequence>
      ))}

      <Sequence from={LEAD_IN_FRAMES} durationInFrames={visualDuration}>
        <TransitionSeries>
          {scenes.map((scene, i) => (
            <Fragment key={scene.key}>
              {i > 0 ? (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({durationInFrames: TRANSITION_FRAMES})}
                />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={scene.durationInFrames}>
                {scene.line ? (
                  <NarrationScene
                    line={scene.line}
                    image={SCENE_IMAGES[scene.imageIndex]}
                    index={scene.imageIndex}
                    total={VOICEOVER.length}
                    durationInFrames={scene.durationInFrames}
                  />
                ) : (
                  <OutroScene
                    image={SCENE_IMAGES[scene.imageIndex]}
                    durationInFrames={scene.durationInFrames}
                  />
                )}
              </TransitionSeries.Sequence>
            </Fragment>
          ))}
        </TransitionSeries>
      </Sequence>

      <ProgressBar />
    </AbsoluteFill>
  );
};
