/**
 * Sending through Expo's push service (https://docs.expo.dev/push-notifications/sending-notifications/).
 *
 * One HTTPS call per 100 messages, no SDK. Expo forwards to FCM (Android) and
 * APNs (iOS), so the server holds no Google or Apple keys; the optional
 * EXPO_ACCESS_TOKEN only matters when "enhanced security" is switched on for
 * the Expo project.
 */
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100; // Expo's limit per request
const TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,100}\]$/;

/** True for a well-formed Expo push token (the only kind the app registers). */
const isExpoPushToken = (token) => typeof token === "string" && TOKEN_PATTERN.test(token);

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/**
 * Send messages ({ to, title, body, data }).
 *
 * @returns {{ sent: number, failed: number, invalidTokens: string[] }}
 *   invalidTokens are the ones Expo says no longer exist (app uninstalled,
 *   notifications switched off for good): the caller deletes them.
 * Never throws: a network error or a refused batch counts as failed.
 */
const sendExpoPush = async (messages, { fetchImpl = globalThis.fetch, accessToken = process.env.EXPO_ACCESS_TOKEN, logger = console } = {}) => {
  const result = { sent: 0, failed: 0, invalidTokens: [] };
  const valid = messages.filter((m) => isExpoPushToken(m.to));
  result.failed += messages.length - valid.length;

  for (const batch of chunk(valid, BATCH_SIZE)) {
    try {
      const response = await fetchImpl(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(
          batch.map((m) => ({ to: m.to, title: m.title, body: m.body, data: m.data, sound: "default", priority: "high", channelId: "default" })),
        ),
      });
      if (!response.ok) {
        result.failed += batch.length;
        logger.warn(`[push] Expo answered ${response.status} for a batch of ${batch.length}`);
        continue;
      }
      const tickets = (await response.json())?.data;
      if (!Array.isArray(tickets)) {
        result.failed += batch.length;
        continue;
      }
      // Tickets come back in the order the messages were sent.
      tickets.forEach((ticket, i) => {
        if (ticket?.status === "ok") {
          result.sent += 1;
          return;
        }
        result.failed += 1;
        if (ticket?.details?.error === "DeviceNotRegistered" && batch[i]) result.invalidTokens.push(batch[i].to);
      });
    } catch (error) {
      result.failed += batch.length;
      logger.warn(`[push] could not reach Expo: ${error.message}`);
    }
  }
  return result;
};

module.exports = { EXPO_PUSH_URL, BATCH_SIZE, isExpoPushToken, sendExpoPush };
