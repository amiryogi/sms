import { useSyncExternalStore } from "react";

/**
 * Whether the launch animation (BrandIntro) is still covering the app. A
 * screen underneath, such as sign-in, waits for it before playing its own
 * entrance, so that entrance is seen rather than played behind the intro.
 * With no intro mounted (tests, later screens) it is never covering.
 */
let covering = false;
const listeners = new Set<() => void>();

export const setIntroCovering = (value: boolean) => {
  if (covering === value) return;
  covering = value;
  listeners.forEach((l) => l());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** True once nothing covers the screen. */
export const useIntroDone = () => !useSyncExternalStore(subscribe, () => covering, () => covering);
