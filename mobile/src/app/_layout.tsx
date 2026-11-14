import "../global.css";
import "@/i18n";
import { useEffect } from "react";
import { Mukta_300Light, Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold, Mukta_700Bold, Mukta_800ExtraBold, useFonts } from "@expo-google-fonts/mukta";
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
import { useStackScreenOptions } from "@/navigation/screenOptions";
import { ConfigError, RestoreError } from "@/features/auth/StartupScreens";
import { BrandIntro } from "@/features/brand/BrandIntro";
import { PushGate } from "@/features/push/PushGate";

// The native splash stays until BrandIntro's first frame (the same picture), then fades into it.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 250, fade: true });
connectNetworkToQuery();

/**
 * Root: providers, then one Stack whose screens are guarded by the session.
 * Guards are navigation only; the API checks every request (CLAUDE.md §3).
 */
export default function RootLayout() {
  useEffect(() => connectAppStateToQuery(), []);
  // The app's typeface; the splash stays up until it is ready (a missing
  // font falls back to the system one rather than blocking the app).
  const [fontsLoaded, fontError] = useFonts({ Mukta_300Light, Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold, Mukta_700Bold, Mukta_800ExtraBold });
  if (!fontsLoaded && !fontError) return null;
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
              <>
                <ConfigError />
                <BrandIntro ready />
              </>
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { status } = useAuth();

  // BrandIntro covers the app (and hides the native splash) until the session is known.
  // It always sits in the same place in the tree, so it keeps playing when the session
  // resolves underneath it.
  return (
    <>
      {status === "booting" ? null : status === "restoreError" ? <RestoreError /> : <Routes />}
      <BrandIntro ready={status !== "booting"} />
    </>
  );
}

function Routes() {
  const { status, user } = useAuth();
  const { scheme } = useTheme();
  const screenOptions = useStackScreenOptions();

  const signedIn = status === "signedIn" && !!user;
  const ready = signedIn && !user.mustChangePassword;
  const roles = user?.roles;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {ready ? <PushGate /> : null}
      <Stack screenOptions={screenOptions}>
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
