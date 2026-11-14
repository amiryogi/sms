import { useEffect, useRef } from "react";
import { router, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/AuthContext";
import { requestChild } from "@/features/portal/ChildContext";
import { areasFor } from "@/utils/roles";
import { hrefForPush, parsePushData } from "./pushLinks";
import { configurePush, notifications, pushSupported, registerForPush, resetPushState } from "./pushNotifications";

/**
 * Mounted while someone is signed in (and past a forced password change):
 *  - registers this phone for their notifications (asking permission once);
 *  - opens the right screen when a notification is tapped, including the one
 *    that launched the app;
 *  - refreshes what is on screen when one arrives while the app is open.
 * Renders nothing.
 */
export const PushGate = () => {
  const user = useUser();
  const queryClient = useQueryClient();
  const roles = user.roles;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    registerForPush({ ask: true });
    return () => resetPushState();
  }, [user.id]);

  useEffect(() => {
    if (!pushSupported) return;
    const N = notifications();
    configurePush();

    const open = (response: import("expo-notifications").NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== N.DEFAULT_ACTION_IDENTIFIER) return;
      const key = response.notification.request.identifier;
      if (handled.current === key) return; // the launch response and the listener can both report it
      handled.current = key;
      const data = parsePushData(response.notification.request.content.data);
      const href = data ? hrefForPush(data, areasFor(roles)) : null;
      N.clearLastNotificationResponseAsync().catch(() => undefined);
      if (!data || !href) return;
      // A parent's notification is about one child: show that child.
      if ("studentId" in data && data.studentId) requestChild(data.studentId);
      router.push(href as Href);
    };

    N.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => undefined);
    const tapped = N.addNotificationResponseReceivedListener(open);
    // Something changed on the server: what is on screen (and the bell) should show it.
    const received = N.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries();
    });
    const tokenChanged = N.addPushTokenListener(() => {
      // The system replaced the token: fetch the new Expo token and register it.
      registerForPush({ ask: false });
    });
    return () => {
      tapped.remove();
      received.remove();
      tokenChanged.remove();
    };
  }, [roles, queryClient]);

  return null;
};
