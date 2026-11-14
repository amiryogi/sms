import { API_URL } from "@/config/env";
import { createApiClient } from "./client";
import { createSecureTokenStore } from "./tokenStore";

/** The app's token store and HTTP client. Services import `http` from here. */
export const tokenStore = createSecureTokenStore();

export const apiClient = createApiClient({ baseURL: API_URL, tokenStore });

export const http = apiClient.http;
