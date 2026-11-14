import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { PREF_KEYS } from "@/lib/storage";

/** A device that has finished onboarding and holds a session. */
export const seedSignedInDevice = async () => {
  await AsyncStorage.setItem(PREF_KEYS.installed, "true");
  await AsyncStorage.setItem(PREF_KEYS.onboardingDone, "true");
  await SecureStore.setItemAsync("sms.accessToken", "access-token");
  await SecureStore.setItemAsync("sms.refreshToken", "refresh-token");
};

/** A device that has finished onboarding but has no session. */
export const seedSignedOutDevice = async () => {
  await AsyncStorage.setItem(PREF_KEYS.installed, "true");
  await AsyncStorage.setItem(PREF_KEYS.onboardingDone, "true");
};

export const resetDevice = async () => {
  await AsyncStorage.clear();
  const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
  store.clear();
};
