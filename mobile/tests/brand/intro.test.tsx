/**
 * The launch animation (src/features/brand/BrandIntro.tsx): it takes over from
 * the native splash, never hides the app before the session is known, can be
 * skipped, and does not animate with Reduce Motion on.
 */
import { fresh, type Fresh } from "../isolated";

jest.mock("expo-splash-screen", () => ({ hide: jest.fn(), hideAsync: jest.fn(), preventAutoHideAsync: jest.fn(), setOptions: jest.fn() }));

// The first render loads the whole UI kit and images (slow on a cold cache).
jest.setTimeout(20000);

const TAGLINE = "Smart School Management for a Better Tomorrow";
const hidden = { includeHiddenElements: true } as const;

let m: Fresh;
beforeEach(async () => {
  m = await fresh();
});

/** The intro over a button that says the session is known. */
const host = () => {
  const { BrandIntro } = m.req<typeof import("@/features/brand/BrandIntro")>("@/features/brand/BrandIntro");
  // Hooks and components from the fresh registry, the same React the intro uses.
  const { useState } = m.req<typeof import("react")>("react");
  const { Pressable } = m.req<typeof import("react-native")>("react-native");
  const Host = () => {
    const [ready, setReady] = useState(false);
    return (
      <>
        <Pressable accessibilityRole="button" accessibilityLabel="session known" onPress={() => setReady(true)} />
        <BrandIntro ready={ready} />
      </>
    );
  };
  return <Host />;
};

const layout = () =>
  m.rtl.fireEvent(m.screen().getByLabelText("Skip the introduction", hidden), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } } });

const reduceMotion = (on: boolean) =>
  jest.spyOn(m.req<typeof import("react-native")>("react-native").AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(on);

test("takes over from the native splash on its first frame, and is hidden from screen readers", async () => {
  reduceMotion(true);
  await m.render(host());
  const splash = m.req<{ hide: jest.Mock }>("expo-splash-screen");
  expect(splash.hide).not.toHaveBeenCalled();
  layout();
  expect(splash.hide).toHaveBeenCalledTimes(1);
  // Present, but not announced: screen readers go straight to the app underneath.
  expect(m.screen().queryByText(TAGLINE)).toBeNull();
  expect(m.screen().getByText(TAGLINE, hidden)).toBeTruthy();
});

test("stays until the session is known, then leaves", async () => {
  reduceMotion(true); // played at once, so only `ready` holds it
  await m.render(host());
  layout();
  await new Promise((r) => setTimeout(r, 600));
  expect(m.screen().getByText(TAGLINE, hidden)).toBeTruthy();

  m.rtl.fireEvent.press(m.screen().getByLabelText("session known"));
  await m.rtl.waitFor(() => expect(m.screen().queryByText(TAGLINE, hidden)).toBeNull(), { timeout: 2000 });
});

test("plays through and leaves by itself once the session is known", async () => {
  reduceMotion(false);
  await m.render(host());
  layout();
  m.rtl.fireEvent.press(m.screen().getByLabelText("session known"));
  // The sequence is about 1.6 s and the fade 0.4 s.
  await m.rtl.waitFor(() => expect(m.screen().queryByText(TAGLINE, hidden)).toBeNull(), { timeout: 4000 });
});

test("a tap skips straight to the end", async () => {
  reduceMotion(false);
  await m.render(host());
  layout();
  m.rtl.fireEvent.press(m.screen().getByLabelText("session known"));
  m.rtl.fireEvent.press(m.screen().getByLabelText("Skip the introduction", hidden));
  await m.rtl.waitFor(() => expect(m.screen().queryByText(TAGLINE, hidden)).toBeNull(), { timeout: 1000 });
});
