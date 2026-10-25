// Google Fonts, self-hosted via @remotion/google-fonts so renders are
// deterministic. `loadFont` registers a delayRender internally and the fonts
// resolve before the first frame is captured.
//
// Anton    → display headlines (heavy condensed uppercase)
// Inter    → body copy, captions, labels

import {loadFont as loadAnton} from "@remotion/google-fonts/Anton";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";

export const anton = loadAnton("normal", {weights: ["400"], subsets: ["latin", "latin-ext"]});

export const inter = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

export const FONT_DISPLAY = anton.fontFamily;
export const FONT_BODY = inter.fontFamily;

export const waitForFonts = () => Promise.all([anton.waitUntilDone(), inter.waitUntilDone()]);
