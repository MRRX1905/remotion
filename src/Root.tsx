import {Composition} from "remotion";
import {MOTIVATION_DURATION, Motivation} from "./Motivation";
import {FPS} from "./voiceover-data";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Motivation"
      component={Motivation}
      durationInFrames={MOTIVATION_DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
