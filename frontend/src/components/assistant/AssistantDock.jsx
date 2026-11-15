import AssistantWidget from "./AssistantWidget";
import GuideRunner from "./guides/GuideRunner";

/**
 * The help assistant and its walkthroughs, as mounted by DashboardLayout. The widget tells
 * the runner which walkthroughs the server allows this user; the runner starts them.
 */
export default function AssistantDock() {
  return (
    <GuideRunner>
      {({ start, setAllowed, active }) => <AssistantWidget onGuidesLoaded={setAllowed} onStartGuide={start} guideActive={active} />}
    </GuideRunner>
  );
}
