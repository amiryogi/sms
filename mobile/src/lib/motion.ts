import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * The phone's Reduce Motion setting, kept current. Screens with entrance
 * animations show their final state at once when it is on. `null` until the
 * setting has been read, so a screen can wait instead of starting to move.
 */
export const useReduceMotion = (): boolean | null => {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((on) => alive && setReduce(on));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => setReduce(on));
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduce;
};
