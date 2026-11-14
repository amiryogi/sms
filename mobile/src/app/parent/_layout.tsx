import { ChildProvider } from "@/features/portal/ChildContext";
import { AreaStack } from "@/navigation/AreaStack";

/** The parent area: every screen works on the child chosen in ChildProvider. */
export default function ParentLayout() {
  return (
    <ChildProvider>
      <AreaStack />
    </ChildProvider>
  );
}
