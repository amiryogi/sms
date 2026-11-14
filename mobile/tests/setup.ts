/**
 * Test environment: native modules the app uses are replaced by in-memory fakes.
 * EXPO_PUBLIC_API_URL points at a fake host; axios calls are intercepted by
 * axios-mock-adapter in each test, so nothing leaves the machine.
 */
process.env.EXPO_PUBLIC_API_URL = "https://api.test/api/v1";

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    __store: store,
  };
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Connected by default; a test can change the value through __setState.
jest.mock("expo-network", () => {
  let state = { isConnected: true, isInternetReachable: true, type: "WIFI" };
  const listeners = new Set<CallableFunction>();
  return {
    NetworkStateType: { WIFI: "WIFI", NONE: "NONE" },
    getNetworkStateAsync: jest.fn(async () => state),
    addNetworkStateListener: jest.fn((l: CallableFunction) => {
      listeners.add(l);
      return { remove: () => listeners.delete(l) };
    }),
    useNetworkState: () => state,
    __setState: (next: Partial<typeof state>) => {
      state = { ...state, ...next };
      listeners.forEach((l) => l(state));
    },
  };
});

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(async () => true),
  hideAsync: jest.fn(async () => true),
  setOptions: jest.fn(),
}));

// NativeWind reads tailwind.config.js (darkMode "class") only through Metro;
// in Jest its runtime has no config, so the scheme hooks are replaced.
jest.mock("nativewind", () => {
  const actual = jest.requireActual("nativewind");
  return {
    ...actual,
    useColorScheme: () => ({ colorScheme: "light", setColorScheme: jest.fn(), toggleColorScheme: jest.fn() }),
    vars: () => ({}),
  };
});
