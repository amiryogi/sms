import "@/i18n";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native/pure";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { createQueryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/theme/ThemeProvider";

/**
 * The app's query client with two test settings: no garbage-collection timer
 * (the app keeps unused data 24 h on a setTimeout, which would hold a single
 * Jest run open) and no automatic retries (errors show at once).
 */
const testQueryClient = () => {
  const client = createQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, gcTime: Infinity, retry: false } });
  return client;
};

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

/** Renders its children only once the (mocked) session has been restored. */
const WhenSignedIn = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();
  return status === "signedIn" ? <>{children}</> : null;
};

/** The app's providers without the router: for screens and hooks tested on their own. */
export const Providers = ({
  children,
  withAuth = true,
  signedIn = false,
  client = testQueryClient(),
}: {
  children: ReactNode;
  withAuth?: boolean;
  /** Wait for the session (seed a signed-in device and mock authService.me first). */
  signedIn?: boolean;
  client?: ReturnType<typeof createQueryClient>;
}) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <QueryClientProvider client={client}>
      <ThemeProvider>
        {withAuth ? <AuthProvider>{signedIn ? <WhenSignedIn>{children}</WhenSignedIn> : children}</AuthProvider> : children}
      </ThemeProvider>
    </QueryClientProvider>
  </SafeAreaProvider>
);

/** Testing Library 14: render is async. */
export const renderWithProviders = (ui: ReactNode, options: { withAuth?: boolean; signedIn?: boolean } = {}) =>
  render(<Providers {...options}>{ui}</Providers>);
