import { Composition } from "remotion";
import { Demo, DURATION } from "./Demo.jsx";
import { QUICK_CLICK_DURATION, QUICK_NOTE_DURATION, QuickClick, QuickNote } from "./QuickStart.jsx";
import { SOLO_DURATION, Solo } from "./Solo.jsx";

// Demo: a designer on a staging site, then a developer and their agent.
// Solo: one developer on the dev server, pasting straight into their agent.
// QuickClick, QuickNote: the Quick Start's two clips.
export function Root() {
  return (
    <>
      <Composition id="Demo" component={Demo} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
      <Composition id="Solo" component={Solo} durationInFrames={SOLO_DURATION} fps={30} width={1920} height={1080} />
      <Composition
        id="QuickClick"
        component={QuickClick}
        durationInFrames={QUICK_CLICK_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="QuickNote"
        component={QuickNote}
        durationInFrames={QUICK_NOTE_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
}
