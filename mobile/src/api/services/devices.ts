import { http } from "../http";
import { unwrap } from "../client";
import type { ApiEnvelope } from "../types";

export type DevicePlatform = "ios" | "android";

/** This phone's registration for push notifications (POST / DELETE /devices). */
export const deviceService = {
  /** Register this phone for the signed-in user, or refresh it. The server takes the user from the session. */
  register: (token: string, platform: DevicePlatform) =>
    unwrap(http.post<ApiEnvelope<{ id: number; platform: string; lastSeenAt: string }>>("/devices", { token, platform })),

  /** Stop pushes to this phone. Signing out does this on the server for every phone of the user. */
  async unregister(token: string): Promise<void> {
    await http.delete(`/devices/${encodeURIComponent(token)}`);
  },
};
