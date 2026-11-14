import "../global.css";
import "@/i18n";
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { API_CONFIGURED } from "@/config/env";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { connectNetworkToQuery } from "@/lib/network";
import { connectAppStateToQuery, queryClient } from "@/lib/queryClient";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { canOpenArea } from "@/utils/roles";
import { ConfigError, RestoreError } from "@/features/auth/StartupScreens";

SplashScreen.preventAutoHideAsync().catch(() => undefined);
connectNetworkToQuery();

/**
 * Root: providers, then one Stack whose screens are guarded by the session.
 * Guards are navigation only; the API checks every request (CLAUDE.md §3).
 */
export default function RootLayout() {
  useEffect(() => connectAppStateToQuery(), []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {API_CONFIGURED ? (
              <AuthProvider>
                <AppStack />
              </AuthProvider>
            ) : (
              <ConfigError />
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { status, user } = useAuth();
  const { scheme, colors } = useTheme();

  useEffect(() => {
    if (status !== "booting") SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  if (status === "booting") return null; // the native splash stays up
  if (status === "restoreError") return <RestoreError />;

  const signedIn = status === "signedIn" && !!user;
  const ready = signedIn && !user.mustChangePassword;
  const roles = user?.roles;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="change-password" options={{ title: "Change password" }} />
        </Stack.Protected>

        <Stack.Protected guard={ready}>
          <Stack.Protected guard={canOpenArea(roles, "student")}>
            <Stack.Screen name="student" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={canOpenArea(roles, "parent")}>
            <Stack.Screen name="parent" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={canOpenArea(roles, "teacher")}>
            <Stack.Screen name="teacher" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={canOpenArea(roles, "exam")}>
            <Stack.Screen name="exam" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={canOpenArea(roles, "finance")}>
            <Stack.Screen name="finance" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={canOpenArea(roles, "admin")}>
            <Stack.Screen name="admin" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Screen name="shared" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
