/**
 * Contract test environment: the real HTTP client against CONTRACT_API_URL,
 * with the device's native storage replaced by in-memory fakes.
 */
if (!process.env.CONTRACT_API_URL) throw new Error("CONTRACT_API_URL is not set: run `npm run test:contract`");
process.env.EXPO_PUBLIC_API_URL = process.env.CONTRACT_API_URL;

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
  };
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
