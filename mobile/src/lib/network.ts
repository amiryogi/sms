import * as Network from "expo-network";
import { onlineManager } from "@tanstack/react-query";

/**
 * TanStack Query follows the device's connection: while offline, queries pause
 * (cached data stays on screen) and resume when the connection returns.
 *
 * "Online" means connected. isInternetReachable is not used: on a school LAN
 * without internet it reports false although the school server is reachable.
 * A server that really can't be reached still shows as a network error.
 */
export const isOnlineState = (state: Network.NetworkState) => state.isConnected !== false;

export const connectNetworkToQuery = () => {
  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync()
      .then((s) => setOnline(isOnlineState(s)))
      .catch(() => setOnline(true));
    const sub = Network.addNetworkStateListener((s) => setOnline(isOnlineState(s)));
    return () => sub.remove();
  });
};
