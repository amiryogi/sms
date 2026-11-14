import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { deviceService } from "@/api/services/devices";

/**
 * Push notifications on this phone: permission, the Expo push token, and
 * registering it with the school's server (POST /devices).
 *
 * - The server decides who is told about what, and sends only a title, one
 *   line and ids. Nothing sensitive is in a notification.
 * - Signing out removes the registration on the server (every phone of the user).
 * - Not available on simulators, nor in Expo Go on Android (remote push was
 *   removed from it): there the module is never even loaded, and the app's own
 *   notification centre keeps working.
 */
export type PushStatus =
  | "unknown" // not checked yet
  | "on" // registered with the server
  | "undetermined" // the person has not been asked
  | "denied" // the person said no (change it in the phone's settings)
  | "unsupported" // simulator, or Expo Go on Android
  | "not-configured" // the build has no EAS project id
  | "error"; // could not reach Expo or the server; retried on the next launch

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const pushSupported = Device.isDevice && !(isExpoGo && Platform.OS === "android");

type Notifications = typeof import("expo-notifications");
/** Loaded on first use, and only where push can work. */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: importing it in Expo Go on Android logs an error
export const notifications = (): Notifications => require("expo-notifications");

/* ---------------------------------------------------------------- status */

let status: PushStatus = "unknown";
let currentToken: string | null = null;
const listeners = new Set<() => void>();
const setStatus = (next: PushStatus) => {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
/** The push state of this phone, for the More screen. */
export const usePushStatus = () => useSyncExternalStore(subscribe, () => status, () => status);
export const getPushToken = () => currentToken;
/** Forget this phone's state at sign-out (the server has dropped the registration). */
export const resetPushState = () => {
  currentToken = null;
  setStatus("unknown");
};

/* ----------------------------------------------------------------- setup */

export const ANDROID_CHANNEL = "default";

let configured = false;
/** How a notification behaves while the app is open, and Android's channel. Safe to call often. */
export const configurePush = async () => {
  if (!pushSupported || configured) return;
  configured = true;
  const N = notifications();
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === "android") {
    // Android 13+ shows the permission prompt only once a channel exists.
    await N.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "School updates",
      description: "Notices, homework, results and attendance from your school.",
      importance: N.AndroidImportance.HIGH,
    });
  }
};

const projectId = (): string | null => {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
};

const isGranted = (p: { granted: boolean; ios?: { status: number } }, N: Notifications) =>
  p.granted || p.ios?.status === N.IosAuthorizationStatus.PROVISIONAL || p.ios?.status === N.IosAuthorizationStatus.EPHEMERAL;

/** Send the token to the server; used at registration and when the system changes the token. */
export const sendTokenToServer = async (token: string) => {
  await deviceService.register(token, Platform.OS === "ios" ? "ios" : "android");
  currentToken = token;
  setStatus("on");
};

/**
 * Make this phone receive the signed-in user's notifications.
 * @param ask  show the system permission prompt if the person has not answered yet
 */
export const registerForPush = async ({ ask }: { ask: boolean }): Promise<PushStatus> => {
  if (!pushSupported) {
    setStatus("unsupported");
    return status;
  }
  try {
    await configurePush();
    const N = notifications();
    let permission = await N.getPermissionsAsync();
    if (!isGranted(permission, N) && permission.canAskAgain && ask) permission = await N.requestPermissionsAsync();
    if (!isGranted(permission, N)) {
      setStatus(permission.canAskAgain ? "undetermined" : "denied");
      return status;
    }
    const id = projectId();
    if (!id) {
      setStatus("not-configured");
      return status;
    }
    const { data: token } = await N.getExpoPushTokenAsync({ projectId: id });
    await sendTokenToServer(token);
  } catch {
    // Offline, Expo unreachable or the server refused: the app works without push.
    setStatus("error");
  }
  return status;
};
