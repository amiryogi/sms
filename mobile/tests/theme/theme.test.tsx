/**
 * Switching appearance (More → Appearance). On a phone the old path, NativeWind's
 * setColorScheme, threw when the theme changed. The provider now only swaps the
 * token values it sets on the root view: these tests pin that, and that the
 * phone's own appearance setting is never touched.
 */
import { Pressable, Text } from "react-native";
import { fresh, type Fresh } from "../isolated";

const Probe = () => {
  // Required from the fresh registry so the provider and this hook share a context.
  const { useTheme } = jest.requireActual<typeof import("@/theme/ThemeProvider")>("@/theme/ThemeProvider");
  const { scheme, preference, colors, setPreference } = useTheme();
  return (
    <>
      <Text>{`scheme:${scheme} preference:${preference} canvas:${colors.canvas} ink:${colors.ink}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="dark" onPress={() => setPreference("dark")} />
      <Pressable accessibilityRole="button" accessibilityLabel="light" onPress={() => setPreference("light")} />
    </>
  );
};

let m: Fresh;
beforeEach(async () => {
  m = await fresh();
});

test("switches between light and dark from the tokens, without touching the system setting", async () => {
  const rn = m.req<typeof import("react-native")>("react-native");
  const appearance = jest.spyOn(rn.Appearance, "setColorScheme").mockImplementation(() => undefined);
  const nativewind = m.req<{ colorScheme: { set: jest.Mock } }>("nativewind");
  const nwSet = jest.spyOn(nativewind.colorScheme, "set").mockImplementation(() => undefined);

  await m.render(<Probe />);
  expect(await m.screen().findByText(/scheme:light preference:system canvas:#F2F4F8/)).toBeTruthy();

  m.rtl.fireEvent.press(m.screen().getByLabelText("dark"));
  expect(await m.screen().findByText(/scheme:dark preference:dark canvas:#0C111C ink:#EDF1F7/)).toBeTruthy();

  m.rtl.fireEvent.press(m.screen().getByLabelText("light"));
  expect(await m.screen().findByText(/scheme:light preference:light canvas:#F2F4F8 ink:#131B2C/)).toBeTruthy();

  expect(appearance).not.toHaveBeenCalled();
  expect(nwSet).not.toHaveBeenCalled();
});

test("remembers the choice on this phone", async () => {
  await m.render(<Probe />);
  m.rtl.fireEvent.press(await m.screen().findByLabelText("dark"));
  await m.screen().findByText(/scheme:dark/);

  const storage = m.req<typeof import("@/lib/storage")>("@/lib/storage");
  await m.rtl.waitFor(async () => expect(await storage.readJson(storage.PREF_KEYS.colorScheme, "system")).toBe("dark"));
});
